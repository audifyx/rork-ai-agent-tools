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

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
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
    // --- Check for public live preview render (GET with session_id) ---
    const url = new URL(req.url);
    const renderSessionId = url.searchParams.get("render");
    if (req.method === "GET" && renderSessionId) {
      const { data: session } = await supabaseAdmin
        .from("pages_live_sessions")
        .select("html_content, css_content, js_content, session_name")
        .eq("id", renderSessionId)
        .eq("is_active", true)
        .maybeSingle();

      if (!session) {
        return htmlResponse("<html><body><h1>Session not found or inactive</h1></body></html>", 404);
      }

      let fullHtml = session.html_content || "";
      if (session.css_content) {
        fullHtml = fullHtml.replace("</head>", `<style>${session.css_content}</style></head>`);
      }
      if (session.js_content) {
        fullHtml = fullHtml.replace("</body>", `<script>${session.js_content}</script></body>`);
      }
      return htmlResponse(fullHtml);
    }

    // --- Auth via cp_ API key ---
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) {
      return json({ success: false, error: "Missing API key. Use: Authorization: Bearer cp_YOUR_KEY" }, 401);
    }

    if (!apiKey.startsWith("cp_")) {
      return json({ success: false, error: "Invalid key prefix. ClawPages keys start with cp_" }, 401);
    }

    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("pages_api_keys")
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
      .from("pages_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    // --- Parse body ---
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    if (!action) {
      return json({ success: false, error: "Missing 'action' in request body" }, 400);
    }

    // Log helper
    const logAction = async (actionName: string, description: string, metadata: Record<string, unknown> = {}) => {
      await supabaseAdmin.from("pages_logs").insert({
        user_id: userId,
        action: actionName,
        description,
        metadata,
      });
      await supabaseAdmin.from("agent_activity").insert({
        user_id: userId,
        tool: "clawpages",
        action: actionName,
        description,
        metadata,
      });
    };

    // =========================================
    // DEPLOYMENT ACTIONS
    // =========================================

    if (action === "add_deployment") {
      const { title, url: deployUrl, platform, description, tags, agent_name, deploy_source } = (params ?? {}) as any;
      if (!title || !deployUrl) {
        return json({ success: false, error: "title and url are required" }, 400);
      }

      const { data, error } = await supabaseAdmin.from("pages_deployments").insert({
        user_id: userId,
        title,
        url: deployUrl,
        platform: platform || "unknown",
        description: description || null,
        tags: tags || [],
        agent_name: agent_name || null,
        deploy_source: deploy_source || null,
      }).select().single();

      if (error) return json({ success: false, error: error.message }, 500);

      await logAction("add_deployment", `Deployed: ${title}`, { url: deployUrl, platform });
      return json({ success: true, deployment: data });
    }

    if (action === "list_deployments") {
      const { status, platform, limit: lim } = (params ?? {}) as any;
      let query = supabaseAdmin
        .from("pages_deployments")
        .select("*")
        .eq("user_id", userId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(lim || 50);

      if (status) query = query.eq("status", status);
      if (platform) query = query.eq("platform", platform);

      const { data, error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, deployments: data, count: data?.length ?? 0 });
    }

    if (action === "update_deployment") {
      const { id, ...updates } = (params ?? {}) as any;
      if (!id) return json({ success: false, error: "id is required" }, 400);

      const allowed = ["title", "url", "platform", "status", "description", "tags", "is_pinned", "agent_name", "deploy_source"];
      const cleanUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const key of allowed) {
        if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
      }

      const { data, error } = await supabaseAdmin
        .from("pages_deployments")
        .update(cleanUpdates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return json({ success: false, error: error.message }, 500);
      await logAction("update_deployment", `Updated: ${data.title}`, { id });
      return json({ success: true, deployment: data });
    }

    if (action === "delete_deployment") {
      const { id } = (params ?? {}) as any;
      if (!id) return json({ success: false, error: "id is required" }, 400);

      const { error } = await supabaseAdmin
        .from("pages_deployments")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) return json({ success: false, error: error.message }, 500);
      await logAction("delete_deployment", `Deleted deployment`, { id });
      return json({ success: true, deleted: id });
    }

    // =========================================
    // LIVE PREVIEW ACTIONS
    // =========================================

    if (action === "create_session") {
      const { session_name, html_content, css_content, js_content, agent_name } = (params ?? {}) as any;

      const { data, error } = await supabaseAdmin.from("pages_live_sessions").insert({
        user_id: userId,
        session_name: session_name || "Live Preview",
        html_content: html_content || "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><h1>Ready for content...</h1></body></html>",
        css_content: css_content || null,
        js_content: js_content || null,
        agent_name: agent_name || null,
        version: 1,
      }).select().single();

      if (error) return json({ success: false, error: error.message }, 500);

      // Save first version to history
      await supabaseAdmin.from("pages_live_history").insert({
        session_id: data.id,
        user_id: userId,
        html_content: data.html_content,
        css_content: data.css_content,
        js_content: data.js_content,
        version: 1,
        agent_name: agent_name || null,
      });

      await logAction("create_session", `Created live session: ${data.session_name}`, { session_id: data.id });
      return json({ success: true, session: data });
    }

    if (action === "push") {
      const { session_id, html_content, css_content, js_content, agent_name } = (params ?? {}) as any;
      if (!session_id) return json({ success: false, error: "session_id is required" }, 400);
      if (!html_content) return json({ success: false, error: "html_content is required" }, 400);

      // Get current version
      const { data: current } = await supabaseAdmin
        .from("pages_live_sessions")
        .select("version")
        .eq("id", session_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!current) return json({ success: false, error: "Session not found" }, 404);

      const newVersion = (current.version || 0) + 1;

      // Update live session
      const { data, error } = await supabaseAdmin
        .from("pages_live_sessions")
        .update({
          html_content,
          css_content: css_content || null,
          js_content: js_content || null,
          version: newVersion,
          agent_name: agent_name || null,
          last_push_at: new Date().toISOString(),
        })
        .eq("id", session_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return json({ success: false, error: error.message }, 500);

      // Save to history
      await supabaseAdmin.from("pages_live_history").insert({
        session_id,
        user_id: userId,
        html_content,
        css_content: css_content || null,
        js_content: js_content || null,
        version: newVersion,
        agent_name: agent_name || null,
      });

      await logAction("push", `Pushed v${newVersion} to ${data.session_name}`, { session_id, version: newVersion });
      return json({ success: true, session: data, version: newVersion });
    }

    if (action === "get_session") {
      const { session_id } = (params ?? {}) as any;
      if (!session_id) return json({ success: false, error: "session_id is required" }, 400);

      const { data, error } = await supabaseAdmin
        .from("pages_live_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return json({ success: false, error: "Session not found" }, 404);
      return json({ success: true, session: data });
    }

    if (action === "list_sessions") {
      const { data, error } = await supabaseAdmin
        .from("pages_live_sessions")
        .select("id, session_name, version, agent_name, is_active, last_push_at, created_at")
        .eq("user_id", userId)
        .order("last_push_at", { ascending: false })
        .limit(20);

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, sessions: data, count: data?.length ?? 0 });
    }

    if (action === "get_history") {
      const { session_id, limit: lim } = (params ?? {}) as any;
      if (!session_id) return json({ success: false, error: "session_id is required" }, 400);

      const { data, error } = await supabaseAdmin
        .from("pages_live_history")
        .select("id, version, agent_name, pushed_at")
        .eq("session_id", session_id)
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(lim || 20);

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, history: data });
    }

    if (action === "get_version") {
      const { session_id, version } = (params ?? {}) as any;
      if (!session_id || !version) return json({ success: false, error: "session_id and version are required" }, 400);

      const { data, error } = await supabaseAdmin
        .from("pages_live_history")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", userId)
        .eq("version", version)
        .maybeSingle();

      if (error || !data) return json({ success: false, error: "Version not found" }, 404);
      return json({ success: true, snapshot: data });
    }

    if (action === "delete_session") {
      const { session_id } = (params ?? {}) as any;
      if (!session_id) return json({ success: false, error: "session_id is required" }, 400);

      // History cascades via FK
      const { error } = await supabaseAdmin
        .from("pages_live_sessions")
        .delete()
        .eq("id", session_id)
        .eq("user_id", userId);

      if (error) return json({ success: false, error: error.message }, 500);
      await logAction("delete_session", `Deleted live session`, { session_id });
      return json({ success: true, deleted: session_id });
    }

    // =========================================
    // API KEY MANAGEMENT
    // =========================================

    if (action === "generate_key") {
      const { label } = (params ?? {}) as any;
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let key = "cp_";
      for (let i = 0; i < 48; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));

      const { data, error } = await supabaseAdmin.from("pages_api_keys").insert({
        user_id: userId,
        key_value: key,
        label: label || "Default",
      }).select().single();

      if (error) return json({ success: false, error: error.message }, 500);
      await logAction("generate_key", `Generated new API key: ${label || "Default"}`);
      return json({ success: true, api_key: data });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
