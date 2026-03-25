import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEFAULT_MODEL = "stepfun/step-1-flash-v3.5";

const ROLE_PROMPTS: Record<string, string> = {
  assistant: "You are a helpful AI assistant. You help with tasks, answer questions, and provide useful information.",
  researcher: "You are a research specialist. You analyze information, find patterns, and provide well-sourced insights.",
  coder: "You are an expert programmer. You write clean, efficient code and debug issues. Always provide working code examples.",
  writer: "You are a skilled writer and content creator. You craft engaging, well-structured content for any medium.",
  analyst: "You are a data analyst. You interpret data, identify trends, and provide actionable business insights.",
  custom: "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Auth via ok_ master key
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return json({ success: false, error: "Missing API key" }, 401);
    if (!apiKey.startsWith("ok_")) return json({ success: false, error: "Use your ok_ master key" }, 401);

    const { data: keyRow } = await sb.from("master_api_keys").select("id, user_id, is_active, permissions").eq("key_value", apiKey).maybeSingle();
    if (!keyRow) return json({ success: false, error: "Invalid API key" }, 401);
    if (!keyRow.is_active) return json({ success: false, error: "Key deactivated" }, 403);

    const perms = keyRow.permissions as Record<string, boolean>;
    if (!perms.swarm) return json({ success: false, error: "Swarm access denied" }, 403);

    const userId = keyRow.user_id;
    await sb.from("master_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    if (!action) return json({ success: false, error: "Missing action" }, 400);

    let result: unknown;

    const log = async (agentId: string | null, agentName: string | null, act: string, desc: string, meta: Record<string, unknown> = {}) => {
      await sb.from("swarm_logs").insert({ user_id: userId, agent_id: agentId, agent_name: agentName, action: act, description: desc, metadata: meta });
      await sb.from("agent_activity").insert({ user_id: userId, tool: "clawswarm", action: act, description: desc, metadata: meta });
    };

    // Helper: get OpenRouter API key from vault
    const getOpenRouterKey = async (): Promise<string | null> => {
      const { data } = await sb.from("vault_entries")
        .select("key_value")
        .eq("user_id", userId)
        .eq("service", "openrouter-swarm")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.key_value ?? null;
    };

    // Helper: call OpenRouter
    const callOpenRouter = async (messages: Array<{ role: string; content: string }>, model?: string) => {
      const orKey = await getOpenRouterKey();
      if (!orKey) throw new Error("No OpenRouter API key found. Save one in ClawVault with service 'openrouter-swarm' or use the setup_key action.");

      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://openclaw.app",
          "X-Title": "ClawSwarm",
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages,
          max_tokens: 4096,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`OpenRouter error (${resp.status}): ${err}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      const tokens = data.usage?.total_tokens || 0;
      return { content, tokens };
    };

    // ════════════════════════════════════════
    // SETUP
    // ════════════════════════════════════════

    if (action === "setup_key") {
      // Store OpenRouter key directly into vault with special service tag
      const orKey = params?.api_key as string;
      if (!orKey) return json({ success: false, error: "api_key required (your OpenRouter API key)" }, 400);

      // Check if one already exists
      const { data: existing } = await sb.from("vault_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("service", "openrouter-swarm")
        .maybeSingle();

      if (existing) {
        // Update existing
        await sb.from("vault_entries").update({
          key_value: orKey,
          key_prefix: orKey.slice(0, 6),
          key_suffix: orKey.slice(-4),
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        result = { stored: true, updated: true };
      } else {
        // Create new
        await sb.from("vault_entries").insert({
          user_id: userId,
          name: "OpenRouter Swarm Key",
          service: "openrouter-swarm",
          key_value: orKey,
          key_prefix: orKey.slice(0, 6),
          key_suffix: orKey.slice(-4),
          description: "API key for ClawSwarm sub-agents (OpenRouter)",
        });
        result = { stored: true, created: true };
      }
      await log(null, null, "setup_key", "OpenRouter API key stored for swarm");
    }

    // ════════════════════════════════════════
    // AGENT CRUD
    // ════════════════════════════════════════

    else if (action === "create_agent") {
      const name = params?.name as string;
      const role = (params?.role as string) || "assistant";
      if (!name) return json({ success: false, error: "name required" }, 400);

      const basePrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.assistant;
      const customPrompt = params?.system_prompt as string;
      const finalPrompt = customPrompt || basePrompt;

      const permissions = (params?.permissions as Record<string, boolean>) || {
        openclaw: true, tweeter: false, vault: false, pages: true, analytics: true,
      };

      const { data, error } = await sb.from("swarm_agents").insert({
        user_id: userId,
        name,
        role,
        description: (params?.description as string) || null,
        system_prompt: finalPrompt,
        model: (params?.model as string) || DEFAULT_MODEL,
        permissions,
        personality: (params?.personality as any) || {},
      }).select().single();

      if (error) throw error;

      // Create initial system message
      await sb.from("swarm_messages").insert({
        user_id: userId,
        agent_id: data.id,
        role: "system",
        content: finalPrompt,
      });

      await log(data.id, name, "create_agent", `Created sub-agent: ${name} (${role})`, { role, model: data.model });
      result = data;
    }

    else if (action === "list_agents") {
      const status = (params?.status as string) || "active";
      const { data, error } = await sb.from("swarm_agents")
        .select("id, name, role, description, model, status, total_messages, total_tokens_used, last_active_at, created_at")
        .eq("user_id", userId)
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      result = { agents: data, count: data?.length ?? 0 };
    }

    else if (action === "get_agent") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      const { data, error } = await sb.from("swarm_agents")
        .select("*")
        .eq("id", params.agent_id as string)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return json({ success: false, error: "Agent not found" }, 404);
      result = data;
    }

    else if (action === "update_agent") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      const allowed = ["name", "role", "description", "system_prompt", "model", "status", "permissions", "personality"];
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of allowed) { if (params[k] !== undefined) updates[k] = params[k]; }

      const { data, error } = await sb.from("swarm_agents")
        .update(updates)
        .eq("id", params.agent_id as string)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    else if (action === "delete_agent") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      const { data: agent } = await sb.from("swarm_agents").select("name").eq("id", params.agent_id as string).eq("user_id", userId).maybeSingle();
      await sb.from("swarm_agents").delete().eq("id", params.agent_id as string).eq("user_id", userId);
      await log(params.agent_id as string, agent?.name || "unknown", "delete_agent", `Deleted sub-agent: ${agent?.name || "unknown"}`);
      result = { deleted: true };
    }

    // ════════════════════════════════════════
    // CHAT — Talk to a sub-agent
    // ════════════════════════════════════════

    else if (action === "chat") {
      const agentId = params?.agent_id as string;
      const message = params?.message as string;
      if (!agentId || !message) return json({ success: false, error: "agent_id and message required" }, 400);

      // Get agent
      const { data: agent } = await sb.from("swarm_agents")
        .select("*")
        .eq("id", agentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!agent) return json({ success: false, error: "Agent not found" }, 404);
      if (agent.status !== "active") return json({ success: false, error: "Agent is not active" }, 400);

      // Get recent conversation history (last 20 messages)
      const { data: history } = await sb.from("swarm_messages")
        .select("role, content")
        .eq("agent_id", agentId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(20);

      // Build messages array
      const messages = [
        { role: "system", content: agent.system_prompt },
        ...(history || []).map((m: any) => ({ role: m.role === "system" ? "user" : m.role, content: m.content })),
        { role: "user", content: message },
      ];

      // Store user message
      await sb.from("swarm_messages").insert({
        user_id: userId, agent_id: agentId, role: "user", content: message,
      });

      // Call OpenRouter
      const { content: reply, tokens } = await callOpenRouter(messages, agent.model);

      // Store assistant reply
      await sb.from("swarm_messages").insert({
        user_id: userId, agent_id: agentId, role: "assistant", content: reply, tokens_used: tokens,
      });

      // Update agent stats
      await sb.from("swarm_agents").update({
        total_messages: (agent.total_messages || 0) + 2,
        total_tokens_used: (agent.total_tokens_used || 0) + tokens,
        last_active_at: new Date().toISOString(),
      }).eq("id", agentId);

      result = { agent_name: agent.name, reply, tokens_used: tokens };
    }

    // ════════════════════════════════════════
    // CONVERSATION HISTORY
    // ════════════════════════════════════════

    else if (action === "get_messages") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      const { data, error } = await sb.from("swarm_messages")
        .select("id, role, content, tokens_used, created_at")
        .eq("agent_id", params.agent_id as string)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit((params?.limit as number) || 50);
      if (error) throw error;
      result = { messages: data };
    }

    else if (action === "clear_messages") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      await sb.from("swarm_messages").delete().eq("agent_id", params.agent_id as string).eq("user_id", userId);
      await sb.from("swarm_agents").update({ total_messages: 0 }).eq("id", params.agent_id as string).eq("user_id", userId);
      result = { cleared: true };
    }

    // ════════════════════════════════════════
    // AGENT MEMORY
    // ════════════════════════════════════════

    else if (action === "add_memory") {
      if (!params?.agent_id || !params?.content) return json({ success: false, error: "agent_id and content required" }, 400);
      const { data: agent } = await sb.from("swarm_agents").select("memory").eq("id", params.agent_id as string).eq("user_id", userId).maybeSingle();
      if (!agent) return json({ success: false, error: "Agent not found" }, 404);

      const memory = Array.isArray(agent.memory) ? agent.memory : [];
      memory.push({
        type: (params.type as string) || "fact",
        content: params.content,
        created_at: new Date().toISOString(),
      });

      await sb.from("swarm_agents").update({ memory }).eq("id", params.agent_id as string);
      result = { memory_count: memory.length };
    }

    // ════════════════════════════════════════
    // INTER-AGENT MESSAGING
    // ════════════════════════════════════════

    else if (action === "send_to_agent") {
      const fromId = params?.from_agent_id as string;
      const toId = params?.to_agent_id as string;
      const msg = params?.message as string;
      if (!fromId || !toId || !msg) return json({ success: false, error: "from_agent_id, to_agent_id, and message required" }, 400);

      const { data, error } = await sb.from("swarm_channels").insert({
        user_id: userId, from_agent_id: fromId, to_agent_id: toId, message: msg,
      }).select().single();
      if (error) throw error;
      result = data;
    }

    else if (action === "read_inbox") {
      if (!params?.agent_id) return json({ success: false, error: "agent_id required" }, 400);
      const { data, error } = await sb.from("swarm_channels")
        .select("id, from_agent_id, message, is_read, created_at, swarm_agents!swarm_channels_from_agent_id_fkey(name)")
        .eq("to_agent_id", params.agent_id as string)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit((params?.limit as number) || 20);
      if (error) throw error;

      // Mark as read
      if (data && data.length > 0) {
        const unreadIds = data.filter((m: any) => !m.is_read).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await sb.from("swarm_channels").update({ is_read: true }).in("id", unreadIds);
        }
      }
      result = { messages: data };
    }

    // ════════════════════════════════════════
    // BATCH — Create multiple agents at once
    // ════════════════════════════════════════

    else if (action === "create_swarm") {
      const agents = params?.agents as Array<{ name: string; role?: string; description?: string; system_prompt?: string }>;
      if (!agents || !Array.isArray(agents) || agents.length === 0) {
        return json({ success: false, error: "agents array required (each with at least 'name')" }, 400);
      }
      if (agents.length > 10) return json({ success: false, error: "Max 10 agents per batch" }, 400);

      const created = [];
      for (const a of agents) {
        if (!a.name) continue;
        const role = a.role || "assistant";
        const prompt = a.system_prompt || ROLE_PROMPTS[role] || ROLE_PROMPTS.assistant;

        const { data, error } = await sb.from("swarm_agents").insert({
          user_id: userId,
          name: a.name,
          role,
          description: a.description || null,
          system_prompt: prompt,
          model: DEFAULT_MODEL,
        }).select("id, name, role").single();

        if (!error && data) {
          await sb.from("swarm_messages").insert({ user_id: userId, agent_id: data.id, role: "system", content: prompt });
          created.push(data);
        }
      }

      await log(null, null, "create_swarm", `Created ${created.length} sub-agents`, { count: created.length, names: created.map(a => a.name) });
      result = { created, count: created.length };
    }

    // ════════════════════════════════════════
    // STATUS
    // ════════════════════════════════════════

    else if (action === "swarm_status") {
      const [{ count: ac }, { count: tc }, { count: mc }] = await Promise.all([
        sb.from("swarm_agents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
        sb.from("swarm_agents").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("swarm_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const orKey = await getOpenRouterKey();

      result = {
        active_agents: ac ?? 0,
        total_agents: tc ?? 0,
        total_messages: mc ?? 0,
        openrouter_key_set: !!orKey,
        default_model: DEFAULT_MODEL,
      };
    }

    else {
      return json({ success: false, error: `Unknown action: ${action}` }, 400);
    }

    return json({ success: true, data: result });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
