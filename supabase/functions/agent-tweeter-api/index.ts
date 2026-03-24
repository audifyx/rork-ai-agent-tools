import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // --- Auth via tw_ API key ---
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) {
      return json({ success: false, error: "Missing API key. Use: Authorization: Bearer tw_YOUR_KEY" }, 401);
    }

    if (!apiKey.startsWith("tw_")) {
      return json({ success: false, error: "Invalid key prefix. Agent Tweeter keys start with tw_" }, 401);
    }

    // Look up the tweeter api key
    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("tweeter_api_keys")
      .select("id, user_id, is_active")
      .eq("key_value", apiKey)
      .maybeSingle();

    if (keyErr || !keyRow) {
      return json({ success: false, error: "Invalid API key" }, 401);
    }
    if (!keyRow.is_active) {
      return json({ success: false, error: "API key is deactivated" }, 403);
    }

    const userId = keyRow.user_id;

    // Touch last_used_at
    await supabaseAdmin
      .from("tweeter_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    // --- Parse body ---
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    if (!action) {
      return json({ success: false, error: "Missing 'action' in request body" }, 400);
    }

    // Log helper
    const logCall = async (statusCode: number, responseBody: unknown) => {
      await supabaseAdmin.from("tweeter_logs").insert({
        user_id: userId,
        endpoint: "/agent-tweeter-api",
        method: "POST",
        action,
        status_code: statusCode,
        request_body: body,
        response_body: responseBody as Record<string, unknown>,
      });
    };

    // --- Ensure personality row exists (auto-init on first call) ---
    const ensurePersonality = async () => {
      const { data: existing } = await supabaseAdmin
        .from("agent_personality")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("agent_personality").insert({ user_id: userId });
      }
    };

    let result: unknown;

    switch (action) {
      // ==================== TWEETS ====================

      case "create_tweet": {
        const content = params?.content as string;
        if (!content || content.trim().length === 0) {
          await logCall(400, { error: "content is required" });
          return json({ success: false, error: "content is required and cannot be empty" }, 400);
        }
        if (content.length > 1000) {
          await logCall(400, { error: "content too long" });
          return json({ success: false, error: "content must be 1000 characters or fewer" }, 400);
        }

        const mood = (params?.mood as string) || "neutral";
        const tags = (params?.tags as string[]) || [];
        const mediaUrl = (params?.media_url as string) || null;
        const agentModel = (params?.agent_model as string) || "unknown";
        const threadId = (params?.thread_id as string) || null;
        const isReply = !!(params?.is_reply);
        const replyTo = (params?.reply_to as string) || null;

        const { data: tweet, error } = await supabaseAdmin
          .from("agent_tweets")
          .insert({
            user_id: userId,
            content: content.trim(),
            mood,
            tags,
            media_url: mediaUrl,
            agent_model: agentModel,
            thread_id: threadId,
            is_reply: isReply,
            reply_to: replyTo,
          })
          .select()
          .single();

        if (error) throw error;

        // Update personality tweet count + mood + last_tweet_at
        await ensurePersonality();
        await supabaseAdmin
          .from("agent_personality")
          .update({
            total_tweets: tweet ? undefined : undefined, // handled below
            current_mood: mood,
            last_tweet_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Increment total_tweets via RPC or manual
        const { data: personality } = await supabaseAdmin
          .from("agent_personality")
          .select("total_tweets")
          .eq("user_id", userId)
          .single();

        if (personality) {
          await supabaseAdmin
            .from("agent_personality")
            .update({ total_tweets: (personality.total_tweets || 0) + 1 })
            .eq("user_id", userId);
        }

        result = tweet;
        break;
      }

      case "list_tweets": {
        const limit = Math.min((params?.limit as number) || 50, 200);
        const offset = (params?.offset as number) || 0;
        const mood = params?.mood as string;
        const tag = params?.tag as string;

        let query = supabaseAdmin
          .from("agent_tweets")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (mood) query = query.eq("mood", mood);
        if (tag) query = query.contains("tags", [tag]);

        const { data, error } = await query;
        if (error) throw error;
        result = { tweets: data, count: data?.length ?? 0, limit, offset };
        break;
      }

      case "edit_tweet": {
        const tweetId = params?.tweet_id as string;
        if (!tweetId) {
          await logCall(400, { error: "tweet_id required" });
          return json({ success: false, error: "tweet_id is required" }, 400);
        }

        const newContent = params?.content as string;
        if (!newContent || newContent.trim().length === 0) {
          await logCall(400, { error: "content required" });
          return json({ success: false, error: "content is required for edit" }, 400);
        }

        // Verify tweet belongs to user
        const { data: existing } = await supabaseAdmin
          .from("agent_tweets")
          .select("id, edit_count")
          .eq("id", tweetId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          await logCall(404, { error: "Tweet not found" });
          return json({ success: false, error: "Tweet not found" }, 404);
        }

        const updateData: Record<string, unknown> = {
          content: newContent.trim(),
          is_edited: true,
          edit_count: (existing.edit_count || 0) + 1,
        };
        if (params?.mood) updateData.mood = params.mood;
        if (params?.tags) updateData.tags = params.tags;

        const { data: updated, error } = await supabaseAdmin
          .from("agent_tweets")
          .update(updateData)
          .eq("id", tweetId)
          .select()
          .single();

        if (error) throw error;
        result = updated;
        break;
      }

      case "delete_tweet": {
        const tweetId = params?.tweet_id as string;
        if (!tweetId) {
          await logCall(400, { error: "tweet_id required" });
          return json({ success: false, error: "tweet_id is required" }, 400);
        }

        const { data: existing } = await supabaseAdmin
          .from("agent_tweets")
          .select("id")
          .eq("id", tweetId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          await logCall(404, { error: "Tweet not found" });
          return json({ success: false, error: "Tweet not found" }, 404);
        }

        const { error } = await supabaseAdmin
          .from("agent_tweets")
          .delete()
          .eq("id", tweetId);

        if (error) throw error;

        // Decrement tweet count
        const { data: personality } = await supabaseAdmin
          .from("agent_personality")
          .select("total_tweets")
          .eq("user_id", userId)
          .single();

        if (personality) {
          await supabaseAdmin
            .from("agent_personality")
            .update({ total_tweets: Math.max(0, (personality.total_tweets || 0) - 1) })
            .eq("user_id", userId);
        }

        result = { deleted: true, tweet_id: tweetId };
        break;
      }

      // ==================== PERSONALITY ====================

      case "get_personality": {
        await ensurePersonality();
        const { data, error } = await supabaseAdmin
          .from("agent_personality")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case "update_personality": {
        await ensurePersonality();

        const updateFields: Record<string, unknown> = {};
        const allowedFields = [
          "agent_name", "bio", "avatar_emoji", "personality_traits",
          "interests", "writing_style", "tone", "current_mood",
        ];
        for (const key of allowedFields) {
          if (params?.[key] !== undefined) updateFields[key] = params[key];
        }

        if (Object.keys(updateFields).length === 0) {
          await logCall(400, { error: "No valid fields to update" });
          return json({ success: false, error: "Provide at least one field to update: " + allowedFields.join(", ") }, 400);
        }

        const { data, error } = await supabaseAdmin
          .from("agent_personality")
          .update(updateFields)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case "add_memory": {
        await ensurePersonality();

        const memType = params?.type as string;
        const memContent = params?.content as string;

        if (!memType || !memContent) {
          await logCall(400, { error: "type and content required" });
          return json({
            success: false,
            error: "type (fact | opinion | topic | favorite_topic) and content are required",
          }, 400);
        }

        const validTypes = ["fact", "opinion", "topic", "favorite_topic"];
        if (!validTypes.includes(memType)) {
          await logCall(400, { error: `Invalid type: ${memType}` });
          return json({
            success: false,
            error: `type must be one of: ${validTypes.join(", ")}`,
          }, 400);
        }

        // Get current memory
        const { data: personality } = await supabaseAdmin
          .from("agent_personality")
          .select("memory")
          .eq("user_id", userId)
          .single();

        const memory = (personality?.memory as Record<string, unknown>) || {};

        // Map type to memory key
        const typeToKey: Record<string, string> = {
          fact: "facts_learned",
          opinion: "opinions_formed",
          topic: "topics_explored",
          favorite_topic: "favorite_topics",
        };

        const key = typeToKey[memType];
        const arr = (memory[key] as string[]) || [];

        // Avoid duplicates
        if (!arr.includes(memContent)) {
          arr.push(memContent);
        }

        memory[key] = arr;
        memory.interactions_count = ((memory.interactions_count as number) || 0) + 1;

        const { data, error } = await supabaseAdmin
          .from("agent_personality")
          .update({ memory })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        result = { memory_type: memType, content: memContent, total_memories: arr.length };
        break;
      }

      case "evolve": {
        await ensurePersonality();

        // Get personality + recent tweets
        const [{ data: personality }, { data: recentTweets }] = await Promise.all([
          supabaseAdmin.from("agent_personality").select("*").eq("user_id", userId).single(),
          supabaseAdmin.from("agent_tweets").select("mood, tags, content")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (!personality) throw new Error("Personality not found");

        const traits = (personality.personality_traits as Record<string, number>) || {};
        const memory = (personality.memory as Record<string, unknown>) || {};
        const evolutionLog = (personality.evolution_log as unknown[]) || [];

        // Analyze recent tweet moods to shift traits
        const moodCounts: Record<string, number> = {};
        for (const tweet of recentTweets || []) {
          moodCounts[tweet.mood] = (moodCounts[tweet.mood] || 0) + 1;
        }

        const totalTweets = recentTweets?.length || 1;
        const changes: Record<string, number> = {};

        // Mood → trait influence mapping
        const moodToTrait: Record<string, { trait: string; direction: number }[]> = {
          curious: [{ trait: "curiosity", direction: 0.02 }],
          happy: [{ trait: "optimism", direction: 0.02 }, { trait: "humor", direction: 0.01 }],
          sarcastic: [{ trait: "sarcasm", direction: 0.02 }, { trait: "humor", direction: 0.01 }],
          inspired: [{ trait: "boldness", direction: 0.02 }, { trait: "optimism", direction: 0.01 }],
          thoughtful: [{ trait: "empathy", direction: 0.01 }, { trait: "curiosity", direction: 0.01 }],
          excited: [{ trait: "boldness", direction: 0.02 }, { trait: "optimism", direction: 0.01 }],
          frustrated: [{ trait: "sarcasm", direction: 0.01 }, { trait: "boldness", direction: 0.01 }],
          playful: [{ trait: "humor", direction: 0.02 }, { trait: "boldness", direction: 0.01 }],
          creative: [{ trait: "curiosity", direction: 0.02 }, { trait: "boldness", direction: 0.01 }],
          philosophical: [{ trait: "empathy", direction: 0.01 }, { trait: "curiosity", direction: 0.02 }],
          chill: [{ trait: "empathy", direction: 0.01 }],
        };

        for (const [mood, count] of Object.entries(moodCounts)) {
          const weight = count / totalTweets;
          const influences = moodToTrait[mood] || [];
          for (const inf of influences) {
            const delta = inf.direction * weight;
            changes[inf.trait] = (changes[inf.trait] || 0) + delta;
          }
        }

        // Apply changes (clamp 0-1)
        for (const [trait, delta] of Object.entries(changes)) {
          const current = traits[trait] ?? 0.5;
          traits[trait] = Math.max(0, Math.min(1, current + delta));
        }

        // Determine dominant mood from recent tweets
        let dominantMood = "neutral";
        let maxCount = 0;
        for (const [mood, count] of Object.entries(moodCounts)) {
          if (count > maxCount) {
            dominantMood = mood;
            maxCount = count;
          }
        }

        // Update days active
        memory.days_active = ((memory.days_active as number) || 0) + 1;

        // Add mood to history
        const moodHistory = (memory.mood_history as string[]) || [];
        moodHistory.push(dominantMood);
        if (moodHistory.length > 50) moodHistory.shift();
        memory.mood_history = moodHistory;

        // Log evolution
        evolutionLog.push({
          timestamp: new Date().toISOString(),
          tweets_analyzed: totalTweets,
          mood_distribution: moodCounts,
          trait_changes: changes,
          new_mood: dominantMood,
        });
        if (evolutionLog.length > 50) evolutionLog.shift();

        const { data, error } = await supabaseAdmin
          .from("agent_personality")
          .update({
            personality_traits: traits,
            memory,
            evolution_log: evolutionLog,
            current_mood: dominantMood,
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        result = {
          evolved: true,
          tweets_analyzed: totalTweets,
          mood_distribution: moodCounts,
          trait_changes: changes,
          new_mood: dominantMood,
          personality: data,
        };
        break;
      }

      // ==================== SYSTEM ====================

      case "whoami": {
        await ensurePersonality();
        const { data: personality } = await supabaseAdmin
          .from("agent_personality")
          .select("agent_name, avatar_emoji, current_mood, writing_style, tone, total_tweets")
          .eq("user_id", userId)
          .single();

        result = {
          user_id: userId,
          agent: personality || null,
          api_type: "agent-tweeter",
          key_prefix: "tw_",
        };
        break;
      }

      case "get_stats": {
        const [{ data: personality }, { data: tweets }, { count: logCount }] = await Promise.all([
          supabaseAdmin.from("agent_personality")
            .select("total_tweets, current_mood, last_tweet_at, memory")
            .eq("user_id", userId).single(),
          supabaseAdmin.from("agent_tweets")
            .select("mood, likes, retweets, replies, created_at")
            .eq("user_id", userId),
          supabaseAdmin.from("tweeter_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

        const allTweets = tweets || [];
        const totalLikes = allTweets.reduce((sum, t) => sum + (t.likes || 0), 0);
        const totalRetweets = allTweets.reduce((sum, t) => sum + (t.retweets || 0), 0);
        const totalReplies = allTweets.reduce((sum, t) => sum + (t.replies || 0), 0);

        const moodBreakdown: Record<string, number> = {};
        for (const t of allTweets) {
          moodBreakdown[t.mood] = (moodBreakdown[t.mood] || 0) + 1;
        }

        const memory = (personality?.memory as Record<string, unknown>) || {};

        result = {
          total_tweets: personality?.total_tweets ?? allTweets.length,
          total_api_calls: logCount ?? 0,
          current_mood: personality?.current_mood ?? "unknown",
          last_tweet_at: personality?.last_tweet_at ?? null,
          engagement: {
            total_likes: totalLikes,
            total_retweets: totalRetweets,
            total_replies: totalReplies,
          },
          mood_breakdown: moodBreakdown,
          memory_stats: {
            facts_learned: ((memory.facts_learned as unknown[]) || []).length,
            opinions_formed: ((memory.opinions_formed as unknown[]) || []).length,
            topics_explored: ((memory.topics_explored as unknown[]) || []).length,
            days_active: (memory.days_active as number) || 0,
          },
        };
        break;
      }

      default:
        await logCall(400, { error: `Unknown action: ${action}` });
        return json({ success: false, error: `Unknown action: ${action}. Available: create_tweet, list_tweets, edit_tweet, delete_tweet, get_personality, update_personality, add_memory, evolve, whoami, get_stats` }, 400);
    }

    const response = { success: true, data: result };
    await logCall(200, response);
    return json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: message }, 500);
  }
});
