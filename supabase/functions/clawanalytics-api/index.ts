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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) return json({ success: false, error: "Missing API key. Use: Authorization: Bearer ca_YOUR_KEY" }, 401);
    if (!apiKey.startsWith("ca_")) return json({ success: false, error: "Invalid key prefix. ClawAnalytics keys start with ca_" }, 401);

    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("analytics_api_keys").select("id, user_id, is_active").eq("key_value", apiKey).maybeSingle();

    if (keyErr || !keyRow) return json({ success: false, error: "Invalid API key" }, 401);
    if (!keyRow.is_active) return json({ success: false, error: "API key is deactivated" }, 403);

    const userId = keyRow.user_id;
    await supabaseAdmin.from("analytics_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    if (!action) return json({ success: false, error: "Missing 'action'" }, 400);

    const logCall = async (statusCode: number, responseBody: unknown) => {
      await supabaseAdmin.from("analytics_logs").insert({ user_id: userId, action, status_code: statusCode, request_body: body, response_body: responseBody as any });
    };

    const logActivity = async (description: string, metadata: Record<string, unknown> = {}) => {
      await supabaseAdmin.from("agent_activity").insert({ user_id: userId, tool: "clawanalytics", action, description, icon: "📊", metadata });
    };

    let result: unknown;

    switch (action) {

      // ==================== TRACK EVENT ====================
      case "track_event": {
        const eventType = params?.event_type as string;
        const tool = (params?.tool as string) || "openclaw";
        const value = (params?.value as number) ?? 1;
        const metadata = (params?.metadata as Record<string, unknown>) || {};

        if (!eventType) return json({ success: false, error: "event_type is required" }, 400);

        const { data, error } = await supabaseAdmin.from("analytics_events").insert({
          user_id: userId, event_type: eventType, tool, value, metadata,
        }).select().single();

        if (error) throw error;

        // Auto-increment usage tracking
        const now = new Date();
        const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const { data: existing } = await supabaseAdmin.from("usage_tracking")
          .select("id, current_value").eq("user_id", userId).eq("period_key", periodKey).eq("tool", tool).eq("metric", "api_calls").maybeSingle();

        if (existing) {
          await supabaseAdmin.from("usage_tracking").update({ current_value: (existing.current_value || 0) + 1 }).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("usage_tracking").insert({ user_id: userId, period_key: periodKey, tool, metric: "api_calls", current_value: 1 });
        }

        result = data;
        break;
      }

      // ==================== GET DASHBOARD ====================
      case "get_dashboard": {
        const [
          { data: files, count: fileCount },
          { data: leads, count: leadCount },
          { count: webhookCount },
          { count: tweetCount },
          { count: secretCount },
          { data: recentActivity },
          { data: recentErrors },
          { data: health },
          { data: usage },
        ] = await Promise.all([
          supabaseAdmin.from("stored_files").select("file_size", { count: "exact" }).eq("user_id", userId),
          supabaseAdmin.from("leads").select("id", { count: "exact" }).eq("user_id", userId),
          supabaseAdmin.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabaseAdmin.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabaseAdmin.from("vault_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
          supabaseAdmin.from("agent_activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
          supabaseAdmin.from("error_log").select("*").eq("user_id", userId).eq("resolved", false).order("created_at", { ascending: false }).limit(5),
          supabaseAdmin.from("agent_health").select("*").eq("user_id", userId).order("checked_at", { ascending: false }).limit(10),
          supabaseAdmin.from("usage_tracking").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
        ]);

        const totalStorage = (files ?? []).reduce((sum, f) => sum + (f.file_size ?? 0), 0);

        result = {
          overview: {
            total_files: fileCount ?? 0,
            total_leads: leadCount ?? 0,
            total_api_calls: webhookCount ?? 0,
            total_tweets: tweetCount ?? 0,
            active_secrets: secretCount ?? 0,
            total_storage_bytes: totalStorage,
          },
          recent_activity: recentActivity ?? [],
          unresolved_errors: recentErrors ?? [],
          health_checks: health ?? [],
          usage: usage ?? [],
        };

        await logActivity("Viewed dashboard");
        break;
      }

      // ==================== GET TOOL STATS ====================
      case "get_tool_stats": {
        const tool = params?.tool as string;
        if (!tool) return json({ success: false, error: "tool is required (openclaw, tweeter, clawvault)" }, 400);

        const timeRange = (params?.hours as number) || 24;
        const since = new Date(Date.now() - timeRange * 3600000).toISOString();

        const [{ data: events }, { data: errors }, { data: health }] = await Promise.all([
          supabaseAdmin.from("analytics_events").select("*").eq("user_id", userId).eq("tool", tool).gte("created_at", since).order("created_at", { ascending: false }),
          supabaseAdmin.from("error_log").select("*").eq("user_id", userId).eq("tool", tool).gte("created_at", since).order("created_at", { ascending: false }),
          supabaseAdmin.from("agent_health").select("*").eq("user_id", userId).eq("tool", tool).order("checked_at", { ascending: false }).limit(1),
        ]);

        const eventsByType: Record<string, number> = {};
        for (const e of events ?? []) {
          eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + (e.value || 1);
        }

        result = {
          tool,
          time_range_hours: timeRange,
          total_events: events?.length ?? 0,
          events_by_type: eventsByType,
          total_errors: errors?.length ?? 0,
          errors: errors ?? [],
          health: health?.[0] ?? null,
        };
        break;
      }

      // ==================== LOG ERROR ====================
      case "log_error": {
        const tool = (params?.tool as string) || "openclaw";
        const actionName = (params?.action_name as string) || "unknown";
        const errorMessage = params?.error_message as string;
        const severity = (params?.severity as string) || "error";

        if (!errorMessage) return json({ success: false, error: "error_message is required" }, 400);

        const { data, error } = await supabaseAdmin.from("error_log").insert({
          user_id: userId, tool, action: actionName, error_message: errorMessage,
          error_code: (params?.error_code as string) || null,
          stack_trace: (params?.stack_trace as string) || null,
          request_body: (params?.request_body as any) || null,
          severity,
        }).select().single();

        if (error) throw error;

        if (severity === "critical") {
          await supabaseAdmin.from("notifications").insert({
            user_id: userId, title: "🚨 Critical Error",
            body: `${tool}: ${errorMessage}`, type: "error", source: "clawanalytics",
          });
        }

        await logActivity(`Logged ${severity}: ${errorMessage.slice(0, 50)}`, { tool, severity });
        result = data;
        break;
      }

      // ==================== RESOLVE ERROR ====================
      case "resolve_error": {
        const errorId = params?.error_id as string;
        if (!errorId) return json({ success: false, error: "error_id is required" }, 400);

        const { data, error } = await supabaseAdmin.from("error_log").update({ resolved: true })
          .eq("id", errorId).eq("user_id", userId).select().single();

        if (error) throw error;
        result = { resolved: true, error: data };
        break;
      }

      // ==================== HEALTH CHECK ====================
      case "report_health": {
        const tool = (params?.tool as string) || "openclaw";
        const status = (params?.status as string) || "healthy";
        const latencyMs = (params?.latency_ms as number) || null;
        const errorCount = (params?.error_count as number) || 0;
        const successCount = (params?.success_count as number) || 0;

        const { data, error } = await supabaseAdmin.from("agent_health").insert({
          user_id: userId, tool, status, latency_ms: latencyMs,
          error_count: errorCount, success_count: successCount,
          last_error: (params?.last_error as string) || null,
        }).select().single();

        if (error) throw error;
        result = data;
        break;
      }

      // ==================== SNAPSHOT ====================
      case "create_snapshot": {
        const tool = (params?.tool as string) || "all";
        const snapshotType = (params?.type as string) || "daily";

        const now = new Date();
        let periodStart: Date;
        if (snapshotType === "hourly") periodStart = new Date(now.getTime() - 3600000);
        else if (snapshotType === "weekly") periodStart = new Date(now.getTime() - 7 * 86400000);
        else periodStart = new Date(now.getTime() - 86400000);

        const since = periodStart.toISOString();
        const [{ count: apiCalls }, { count: filesUploaded }, { count: leadsCreated }, { count: tweetsPosted }, { count: secretsRead }, { count: errors }] = await Promise.all([
          supabaseAdmin.from("webhook_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
          supabaseAdmin.from("stored_files").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
          supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
          supabaseAdmin.from("agent_tweets").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
          supabaseAdmin.from("vault_access_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
          supabaseAdmin.from("error_log").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
        ]);

        const metrics = {
          api_calls: apiCalls ?? 0, files_uploaded: filesUploaded ?? 0,
          leads_created: leadsCreated ?? 0, tweets_posted: tweetsPosted ?? 0,
          secrets_read: secretsRead ?? 0, errors: errors ?? 0,
        };

        const { data, error } = await supabaseAdmin.from("agent_snapshots").insert({
          user_id: userId, snapshot_type: snapshotType, period_start: since,
          period_end: now.toISOString(), tool, metrics,
        }).select().single();

        if (error) throw error;
        await logActivity(`Created ${snapshotType} snapshot`, { tool, metrics });
        result = { snapshot: data, metrics };
        break;
      }

      // ==================== CUSTOM METRICS ====================
      case "set_metric": {
        const name = params?.name as string;
        const value = params?.value as number;
        if (!name || value === undefined) return json({ success: false, error: "name and value required" }, 400);

        const tool = (params?.tool as string) || "custom";
        const { data: existing } = await supabaseAdmin.from("custom_metrics")
          .select("id, value").eq("user_id", userId).eq("name", name).eq("tool", tool).maybeSingle();

        let data, error;
        if (existing) {
          const trend = value > existing.value ? "up" : value < existing.value ? "down" : "stable";
          ({ data, error } = await supabaseAdmin.from("custom_metrics").update({
            value, previous_value: existing.value, trend,
            description: (params?.description as string) || undefined,
            unit: (params?.unit as string) || undefined,
            target_value: (params?.target_value as number) || undefined,
            tags: (params?.tags as string[]) || undefined,
            metadata: (params?.metadata as any) || undefined,
          }).eq("id", existing.id).select().single());
        } else {
          ({ data, error } = await supabaseAdmin.from("custom_metrics").insert({
            user_id: userId, name, value, tool,
            description: (params?.description as string) || null,
            unit: (params?.unit as string) || "count",
            target_value: (params?.target_value as number) || null,
            tags: (params?.tags as string[]) || [],
            metadata: (params?.metadata as any) || {},
          }).select().single());
        }

        if (error) throw error;
        result = data;
        break;
      }

      case "get_metrics": {
        const tool = params?.tool as string;
        let query = supabaseAdmin.from("custom_metrics").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
        if (tool) query = query.eq("tool", tool);
        const { data, error } = await query;
        if (error) throw error;
        result = { metrics: data, count: data?.length ?? 0 };
        break;
      }

      // ==================== USAGE ====================
      case "get_usage": {
        const period = (params?.period as string) || "monthly";
        const { data, error } = await supabaseAdmin.from("usage_tracking").select("*")
          .eq("user_id", userId).eq("period", period).order("updated_at", { ascending: false });
        if (error) throw error;
        result = { usage: data, count: data?.length ?? 0 };
        break;
      }

      // ==================== SYSTEM ====================
      case "whoami": {
        const [{ count: eventCount }, { count: errorCount }, { count: snapshotCount }] = await Promise.all([
          supabaseAdmin.from("analytics_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabaseAdmin.from("error_log").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("resolved", false),
          supabaseAdmin.from("agent_snapshots").select("id", { count: "exact", head: true }).eq("user_id", userId),
        ]);
        result = { user_id: userId, api_type: "clawanalytics", key_prefix: "ca_", total_events: eventCount ?? 0, unresolved_errors: errorCount ?? 0, snapshots: snapshotCount ?? 0 };
        break;
      }

      default:
        await logCall(400, { error: `Unknown action: ${action}` });
        return json({ success: false, error: `Unknown action: ${action}. Available: track_event, get_dashboard, get_tool_stats, log_error, resolve_error, report_health, create_snapshot, set_metric, get_metrics, get_usage, whoami` }, 400);
    }

    const response = { success: true, data: result };
    await logCall(200, response);
    return json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: message }, 500);
  }
});
