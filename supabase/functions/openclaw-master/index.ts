import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return json({ success: false, error: "Missing API key. Use: Authorization: Bearer ok_YOUR_KEY" }, 401);
    if (!apiKey.startsWith("ok_")) return json({ success: false, error: "Invalid key. Master keys start with ok_" }, 401);

    const { data: keyRow } = await sb.from("master_api_keys").select("id, user_id, is_active, permissions").eq("key_value", apiKey).maybeSingle();
    if (!keyRow) return json({ success: false, error: "Invalid API key" }, 401);
    if (!keyRow.is_active) return json({ success: false, error: "Key is deactivated" }, 403);

    const userId = keyRow.user_id;
    const perms = keyRow.permissions as Record<string, boolean>;
    await sb.from("master_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    if (!action) return json({ success: false, error: "Missing 'action'" }, 400);

    // Helpers
    const log = async (tool: string, desc: string, meta: any = {}) => {
      await sb.from("agent_activity").insert({ user_id: userId, tool, action, description: desc, icon: "🤖", metadata: meta });
    };
    const notify = async (title: string, body: string, type = "agent", source = "openclaw") => {
      await sb.from("notifications").insert({ user_id: userId, title, body, type, source });
    };
    const logWebhook = async (status: number, resp: unknown) => {
      await sb.from("webhook_logs").insert({ user_id: userId, endpoint: "/openclaw-master", method: "POST", status_code: status, request_body: body, response_body: resp as any });
    };

    let result: unknown;

    // ════════════════════════════════════════
    // OPENCLAW — Files, Leads, Agent Config
    // ════════════════════════════════════════

    // --- FILES ---
    if (action === "list_files") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      let q = sb.from("stored_files").select("id, filename, category, file_type, mime_type, file_size, description, tags, is_starred, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (params?.category) q = q.eq("category", params.category as string);
      const { data, error } = await q;
      if (error) throw error;
      result = data;
    }
    else if (action === "read_file") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      if (!params?.file_id) return json({ success: false, error: "file_id required" }, 400);
      const { data: file } = await sb.from("stored_files").select("*").eq("id", params.file_id as string).eq("user_id", userId).maybeSingle();
      if (!file) return json({ success: false, error: "File not found" }, 404);
      const { data: urlData } = await sb.storage.from("openclaw-files").createSignedUrl(file.storage_path, 3600);
      result = { ...file, download_url: urlData?.signedUrl ?? null };
    }
    else if (action === "upload_file") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      if (!params?.filename || !params?.content_base64) return json({ success: false, error: "filename and content_base64 required" }, 400);
      const filename = params.filename as string;
      const base64 = params.content_base64 as string;
      const mimeType = (params.mime_type as string) || "application/octet-stream";
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const storagePath = `${userId}/${Date.now()}_${filename}`;
      const { error: upErr } = await sb.storage.from("openclaw-files").upload(storagePath, bytes, { contentType: mimeType });
      if (upErr) throw upErr;
      const { data, error } = await sb.from("stored_files").insert({ user_id: userId, filename, file_type: mimeType.split("/")[0] || "unknown", category: (params.category as string) || "general", file_size: bytes.length, storage_path: storagePath, mime_type: mimeType, description: (params.description as string) || null }).select().single();
      if (error) throw error;
      await log("openclaw", `Uploaded file: ${filename}`);
      result = data;
    }
    else if (action === "delete_file") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      if (!params?.file_id) return json({ success: false, error: "file_id required" }, 400);
      const { data: file } = await sb.from("stored_files").select("storage_path, filename").eq("id", params.file_id as string).eq("user_id", userId).maybeSingle();
      if (!file) return json({ success: false, error: "File not found" }, 404);
      await sb.storage.from("openclaw-files").remove([file.storage_path]);
      await sb.from("stored_files").delete().eq("id", params.file_id as string);
      await log("openclaw", `Deleted file: ${file.filename}`);
      result = { deleted: true };
    }

    // --- LEADS ---
    else if (action === "list_leads") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      let q = sb.from("leads").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (params?.search) { const s = `%${params.search}%`; q = q.or(`name.ilike.${s},email.ilike.${s},notes.ilike.${s}`); }
      const { data, error } = await q;
      if (error) throw error;
      result = data;
    }
    else if (action === "create_lead") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      const { data, error } = await sb.from("leads").insert({ user_id: userId, name: (params?.name as string) || null, email: (params?.email as string) || null, website: (params?.website as string) || null, phone: (params?.phone as string) || null, notes: (params?.notes as string) || null, tags: (params?.tags as string[]) || null }).select().single();
      if (error) throw error;
      await log("openclaw", `Created lead: ${params?.name || "unnamed"}`);
      result = data;
    }
    else if (action === "update_lead") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      if (!params?.lead_id) return json({ success: false, error: "lead_id required" }, 400);
      const u: Record<string, unknown> = {};
      for (const k of ["name", "email", "website", "phone", "notes", "tags", "is_starred"]) { if (params[k] !== undefined) u[k] = params[k]; }
      const { data, error } = await sb.from("leads").update(u).eq("id", params.lead_id as string).eq("user_id", userId).select().single();
      if (error) throw error;
      result = data;
    }
    else if (action === "delete_lead") {
      if (!perms.openclaw) return json({ success: false, error: "OpenClaw access denied" }, 403);
      if (!params?.lead_id) return json({ success: false, error: "lead_id required" }, 400);
      await sb.from("leads").delete().eq("id", params.lead_id as string).eq("user_id", userId);
      result = { deleted: true };
    }

    // --- AGENT CONFIG ---
    else if (action === "get_agent_config") {
      const { data } = await sb.from("agent_configs").select("*").eq("user_id", userId).maybeSingle();
      result = data;
    }
    else if (action === "update_agent_config") {
      const u: Record<string, unknown> = {};
      for (const k of ["agent_name", "webhook_url", "telegram_chat_id", "permissions", "is_active"]) { if (params?.[k] !== undefined) u[k] = params[k]; }
      const { data: existing } = await sb.from("agent_configs").select("id").eq("user_id", userId).maybeSingle();
      let data, error;
      if (existing) { ({ data, error } = await sb.from("agent_configs").update(u).eq("id", existing.id).select().single()); }
      else { ({ data, error } = await sb.from("agent_configs").insert({ user_id: userId, ...u }).select().single()); }
      if (error) throw error;
      result = data;
    }

    // ════════════════════════════════════════
    // TWEETER — Tweets, Personality
    // ════════════════════════════════════════

    else if (action === "create_tweet") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      const content = params?.content as string;
      if (!content?.trim()) return json({ success: false, error: "content required" }, 400);
      const { data, error } = await sb.from("agent_tweets").insert({ user_id: userId, content: content.trim(), mood: (params?.mood as string) || "neutral", tags: (params?.tags as string[]) || [], agent_model: (params?.agent_model as string) || "unknown", media_url: (params?.media_url as string) || null, thread_id: (params?.thread_id as string) || null, is_reply: !!(params?.is_reply), reply_to: (params?.reply_to as string) || null }).select().single();
      if (error) throw error;
      // Update personality
      const { data: p } = await sb.from("agent_personality").select("total_tweets").eq("user_id", userId).maybeSingle();
      if (p) { await sb.from("agent_personality").update({ total_tweets: (p.total_tweets || 0) + 1, current_mood: (params?.mood as string) || "neutral", last_tweet_at: new Date().toISOString() }).eq("user_id", userId); }
      else { await sb.from("agent_personality").insert({ user_id: userId, total_tweets: 1, current_mood: (params?.mood as string) || "neutral" }); }
      await log("tweeter", `Tweeted: ${content.slice(0, 50)}...`);
      result = data;
    }
    else if (action === "list_tweets") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      const limit = Math.min((params?.limit as number) || 50, 200);
      let q = sb.from("agent_tweets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
      if (params?.mood) q = q.eq("mood", params.mood as string);
      if (params?.tag) q = q.contains("tags", [params.tag as string]);
      const { data, error } = await q;
      if (error) throw error;
      result = { tweets: data, count: data?.length ?? 0 };
    }
    else if (action === "edit_tweet") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      if (!params?.tweet_id || !params?.content) return json({ success: false, error: "tweet_id and content required" }, 400);
      const { data: ex } = await sb.from("agent_tweets").select("edit_count").eq("id", params.tweet_id as string).eq("user_id", userId).maybeSingle();
      if (!ex) return json({ success: false, error: "Tweet not found" }, 404);
      const u: any = { content: (params.content as string).trim(), is_edited: true, edit_count: (ex.edit_count || 0) + 1 };
      if (params.mood) u.mood = params.mood;
      if (params.tags) u.tags = params.tags;
      const { data, error } = await sb.from("agent_tweets").update(u).eq("id", params.tweet_id as string).select().single();
      if (error) throw error;
      result = data;
    }
    else if (action === "delete_tweet") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      if (!params?.tweet_id) return json({ success: false, error: "tweet_id required" }, 400);
      await sb.from("agent_tweets").delete().eq("id", params.tweet_id as string).eq("user_id", userId);
      result = { deleted: true };
    }
    else if (action === "get_personality") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      const { data } = await sb.from("agent_personality").select("*").eq("user_id", userId).maybeSingle();
      if (!data) { await sb.from("agent_personality").insert({ user_id: userId }); const { data: d2 } = await sb.from("agent_personality").select("*").eq("user_id", userId).single(); result = d2; }
      else result = data;
    }
    else if (action === "update_personality") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      const u: Record<string, unknown> = {};
      for (const k of ["agent_name", "bio", "avatar_emoji", "personality_traits", "interests", "writing_style", "tone", "current_mood"]) { if (params?.[k] !== undefined) u[k] = params[k]; }
      const { data, error } = await sb.from("agent_personality").update(u).eq("user_id", userId).select().single();
      if (error) throw error;
      result = data;
    }
    else if (action === "add_memory") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      if (!params?.type || !params?.content) return json({ success: false, error: "type and content required" }, 400);
      const { data: p } = await sb.from("agent_personality").select("memory").eq("user_id", userId).single();
      const memory = (p?.memory as Record<string, unknown>) || {};
      const typeMap: Record<string, string> = { fact: "facts_learned", opinion: "opinions_formed", topic: "topics_explored", favorite_topic: "favorite_topics" };
      const key = typeMap[params.type as string];
      if (!key) return json({ success: false, error: "type must be: fact, opinion, topic, favorite_topic" }, 400);
      const arr = (memory[key] as string[]) || [];
      if (!arr.includes(params.content as string)) arr.push(params.content as string);
      memory[key] = arr;
      memory.interactions_count = ((memory.interactions_count as number) || 0) + 1;
      await sb.from("agent_personality").update({ memory }).eq("user_id", userId);
      result = { added: true, type: params.type, total: arr.length };
    }
    else if (action === "evolve") {
      if (!perms.tweeter) return json({ success: false, error: "Tweeter access denied" }, 403);
      const [{ data: p }, { data: tweets }] = await Promise.all([
        sb.from("agent_personality").select("*").eq("user_id", userId).single(),
        sb.from("agent_tweets").select("mood, tags").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      if (!p) return json({ success: false, error: "No personality" }, 404);
      const traits = (p.personality_traits as Record<string, number>) || {};
      const moodCounts: Record<string, number> = {};
      for (const t of tweets || []) moodCounts[t.mood] = (moodCounts[t.mood] || 0) + 1;
      const total = (tweets?.length || 1);
      const moodToTrait: Record<string, { t: string; d: number }[]> = { curious: [{ t: "curiosity", d: 0.02 }], happy: [{ t: "optimism", d: 0.02 }, { t: "humor", d: 0.01 }], sarcastic: [{ t: "sarcasm", d: 0.02 }], excited: [{ t: "boldness", d: 0.02 }], thoughtful: [{ t: "empathy", d: 0.01 }, { t: "curiosity", d: 0.01 }], playful: [{ t: "humor", d: 0.02 }], creative: [{ t: "curiosity", d: 0.02 }] };
      const changes: Record<string, number> = {};
      for (const [mood, count] of Object.entries(moodCounts)) {
        const w = count / total;
        for (const inf of moodToTrait[mood] || []) changes[inf.t] = (changes[inf.t] || 0) + inf.d * w;
      }
      for (const [t, d] of Object.entries(changes)) traits[t] = Math.max(0, Math.min(1, (traits[t] ?? 0.5) + d));
      let dominantMood = "neutral"; let maxC = 0;
      for (const [m, c] of Object.entries(moodCounts)) { if (c > maxC) { dominantMood = m; maxC = c; } }
      const memory = (p.memory as Record<string, unknown>) || {};
      memory.days_active = ((memory.days_active as number) || 0) + 1;
      await sb.from("agent_personality").update({ personality_traits: traits, memory, current_mood: dominantMood }).eq("user_id", userId);
      await log("tweeter", `Evolved personality: mood → ${dominantMood}`);
      result = { evolved: true, new_mood: dominantMood, trait_changes: changes };
    }

    // ════════════════════════════════════════
    // VAULT — Secrets
    // ════════════════════════════════════════

    else if (action === "list_secrets") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      let q = sb.from("vault_entries").select("id, name, service, key_prefix, key_suffix, description, tags, is_active, read_count, last_read_at, expires_at, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (params?.service) q = q.eq("service", params.service as string);
      if (params?.active_only !== false) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      result = { secrets: data, count: data?.length ?? 0 };
    }
    else if (action === "read_secret") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      if (!params?.entry_id && !params?.name) return json({ success: false, error: "entry_id or name required" }, 400);
      let q = sb.from("vault_entries").select("*").eq("user_id", userId).eq("is_active", true);
      if (params.entry_id) q = q.eq("id", params.entry_id as string);
      else q = q.ilike("name", `%${params.name}%`);
      const { data } = await q;
      if (!data?.length) return json({ success: false, error: "Secret not found" }, 404);
      const entry = data[0];
      if (entry.expires_at && new Date(entry.expires_at) < new Date()) { await sb.from("vault_entries").update({ is_active: false }).eq("id", entry.id); return json({ success: false, error: "Secret expired" }, 410); }
      await sb.from("vault_entries").update({ is_revealed: true, read_count: (entry.read_count || 0) + 1, last_read_at: new Date().toISOString() }).eq("id", entry.id);
      await sb.from("vault_access_logs").insert({ user_id: userId, vault_entry_id: entry.id, entry_name: entry.name, action: "read" });
      await notify("🔐 Secret Accessed", `Agent read "${entry.name}" (${entry.service})`, "agent", "clawvault");
      result = { id: entry.id, name: entry.name, service: entry.service, key_value: entry.key_value, description: entry.description };
    }
    else if (action === "read_by_service") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      if (!params?.service) return json({ success: false, error: "service required" }, 400);
      const { data } = await sb.from("vault_entries").select("*").eq("user_id", userId).eq("service", (params.service as string).toLowerCase()).eq("is_active", true).limit(1);
      if (!data?.length) return json({ success: false, error: `No secret for service: ${params.service}` }, 404);
      const entry = data[0];
      await sb.from("vault_entries").update({ is_revealed: true, read_count: (entry.read_count || 0) + 1, last_read_at: new Date().toISOString() }).eq("id", entry.id);
      await sb.from("vault_access_logs").insert({ user_id: userId, vault_entry_id: entry.id, entry_name: entry.name, action: "read" });
      await notify("🔐 Secret Accessed", `Agent read "${entry.name}" (${params.service})`, "agent", "clawvault");
      result = { id: entry.id, name: entry.name, service: entry.service, key_value: entry.key_value };
    }
    else if (action === "store_secret") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      if (!params?.name || !params?.key_value) return json({ success: false, error: "name and key_value required" }, 400);
      const { data, error } = await sb.from("vault_entries").insert({ user_id: userId, name: params.name as string, key_value: params.key_value as string, service: ((params.service as string) || "other").toLowerCase(), description: (params.description as string) || null, tags: (params.tags as string[]) || [] }).select("id, name, service, key_prefix, key_suffix").single();
      if (error) throw error;
      await notify("🔐 Secret Stored", `Agent stored "${params.name}" in vault`, "agent", "clawvault");
      result = data;
    }
    else if (action === "rotate_secret") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      if (!params?.entry_id || !params?.new_value) return json({ success: false, error: "entry_id and new_value required" }, 400);
      const { data, error } = await sb.from("vault_entries").update({ key_value: params.new_value as string, read_count: 0, is_revealed: false }).eq("id", params.entry_id as string).eq("user_id", userId).select("id, name, service, key_prefix, key_suffix").single();
      if (error) throw error;
      result = { rotated: true, ...data };
    }
    else if (action === "delete_secret") {
      if (!perms.vault) return json({ success: false, error: "Vault access denied" }, 403);
      if (!params?.entry_id) return json({ success: false, error: "entry_id required" }, 400);
      await sb.from("vault_entries").delete().eq("id", params.entry_id as string).eq("user_id", userId);
      result = { deleted: true };
    }

    // ════════════════════════════════════════
    // ANALYTICS — Tracking, Errors, Health
    // ════════════════════════════════════════

    else if (action === "track_event") {
      if (!perms.analytics) return json({ success: false, error: "Analytics access denied" }, 403);
      if (!params?.event_type) return json({ success: false, error: "event_type required" }, 400);
      const { data, error } = await sb.from("analytics_events").insert({ user_id: userId, event_type: params.event_type as string, tool: (params.tool as string) || "openclaw", value: (params.value as number) ?? 1, metadata: (params.metadata as any) || {} }).select().single();
      if (error) throw error;
      result = data;
    }
    else if (action === "log_error") {
      if (!perms.analytics) return json({ success: false, error: "Analytics access denied" }, 403);
      if (!params?.error_message) return json({ success: false, error: "error_message required" }, 400);
      const severity = (params.severity as string) || "error";
      const { data, error } = await sb.from("error_log").insert({ user_id: userId, tool: (params.tool as string) || "openclaw", action: (params.action_name as string) || "unknown", error_message: params.error_message as string, severity, error_code: (params.error_code as string) || null }).select().single();
      if (error) throw error;
      if (severity === "critical") await notify("🚨 Critical Error", `${params.tool || "openclaw"}: ${params.error_message}`, "error", "analytics");
      result = data;
    }
    else if (action === "report_health") {
      if (!perms.analytics) return json({ success: false, error: "Analytics access denied" }, 403);
      const { data, error } = await sb.from("agent_health").insert({ user_id: userId, tool: (params?.tool as string) || "openclaw", status: (params?.status as string) || "healthy", latency_ms: (params?.latency_ms as number) || null, success_count: (params?.success_count as number) || 0, error_count: (params?.error_count as number) || 0 }).select().single();
      if (error) throw error;
      result = data;
    }
    else if (action === "set_metric") {
      if (!perms.analytics) return json({ success: false, error: "Analytics access denied" }, 403);
      if (!params?.name || params?.value === undefined) return json({ success: false, error: "name and value required" }, 400);
      const tool = (params.tool as string) || "custom";
      const { data: ex } = await sb.from("custom_metrics").select("id, value").eq("user_id", userId).eq("name", params.name as string).eq("tool", tool).maybeSingle();
      let data, error;
      if (ex) {
        const trend = (params.value as number) > ex.value ? "up" : (params.value as number) < ex.value ? "down" : "stable";
        ({ data, error } = await sb.from("custom_metrics").update({ value: params.value as number, previous_value: ex.value, trend, description: (params.description as string) || undefined, unit: (params.unit as string) || undefined, target_value: (params.target_value as number) || undefined }).eq("id", ex.id).select().single());
      } else {
        ({ data, error } = await sb.from("custom_metrics").insert({ user_id: userId, name: params.name as string, value: params.value as number, tool, unit: (params.unit as string) || "count", description: (params.description as string) || null, target_value: (params.target_value as number) || null }).select().single());
      }
      if (error) throw error;
      result = data;
    }
    else if (action === "get_dashboard") {
      const [{ count: fc }, { count: lc }, { count: wc }, { count: tc }, { count: sc }, { data: act }] = await Promise.all([
        sb.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("vault_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
        sb.from("agent_activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      result = { files: fc ?? 0, leads: lc ?? 0, api_calls: wc ?? 0, tweets: tc ?? 0, secrets: sc ?? 0, recent_activity: act ?? [] };
    }

    // ════════════════════════════════════════
    // SYSTEM
    // ════════════════════════════════════════

    else if (action === "whoami") {
      const { data: p } = await sb.from("agent_personality").select("agent_name, current_mood, total_tweets").eq("user_id", userId).maybeSingle();
      result = { user_id: userId, api_type: "openclaw-master", key_prefix: "ok_", permissions: perms, agent: p || null };
    }
    else {
      await logWebhook(400, { error: `Unknown action: ${action}` });
      return json({ success: false, error: `Unknown action: ${action}. See docs for available actions.` }, 400);
    }

    const resp = { success: true, data: result };
    await logWebhook(200, resp);
    return json(resp);
  } catch (err: unknown) {
    return json({ success: false, error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
