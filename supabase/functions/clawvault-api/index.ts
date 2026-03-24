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
    // --- Auth via cv_ API key ---
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) {
      return json({ success: false, error: "Missing API key. Use: Authorization: Bearer cv_YOUR_KEY" }, 401);
    }

    if (!apiKey.startsWith("cv_")) {
      return json({ success: false, error: "Invalid key prefix. ClawVault keys start with cv_" }, 401);
    }

    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("vault_api_keys")
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
      .from("vault_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    // --- Parse body ---
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    if (!action) {
      return json({ success: false, error: "Missing 'action' in request body" }, 400);
    }

    // Log helper
    const logAccess = async (entryId: string, entryName: string, accessAction: string) => {
      await supabaseAdmin.from("vault_access_logs").insert({
        user_id: userId,
        vault_entry_id: entryId,
        entry_name: entryName,
        action: accessAction,
      });
    };

    // Also log to agent_activity for the unified feed
    const logActivity = async (description: string, metadata: Record<string, unknown> = {}) => {
      await supabaseAdmin.from("agent_activity").insert({
        user_id: userId,
        tool: "clawvault",
        action,
        description,
        icon: "🔐",
        metadata,
      });
    };

    let result: unknown;

    switch (action) {
      // ==================== LIST SECRETS ====================
      // Returns names, services, tags — but NOT the actual key values
      case "list_secrets": {
        const service = params?.service as string;
        const tag = params?.tag as string;
        const activeOnly = params?.active_only !== false; // default true

        let query = supabaseAdmin
          .from("vault_entries")
          .select("id, name, service, key_prefix, key_suffix, description, tags, is_active, is_revealed, read_count, last_read_at, expires_at, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (activeOnly) query = query.eq("is_active", true);
        if (service) query = query.eq("service", service);
        if (tag) query = query.contains("tags", [tag]);

        const { data, error } = await query;
        if (error) throw error;

        await logActivity(`Listed ${data?.length ?? 0} vault secrets`);
        result = { secrets: data, count: data?.length ?? 0 };
        break;
      }

      // ==================== READ SECRET ====================
      // Returns the ACTUAL key value — this is the core feature
      // Agent says "read my OpenAI key" → gets the actual value
      case "read_secret": {
        const entryId = params?.entry_id as string;
        const entryName = params?.name as string;

        if (!entryId && !entryName) {
          return json({ success: false, error: "Provide entry_id or name to read a secret" }, 400);
        }

        let query = supabaseAdmin
          .from("vault_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (entryId) {
          query = query.eq("id", entryId);
        } else if (entryName) {
          query = query.ilike("name", `%${entryName}%`);
        }

        const { data: entries, error } = await query;
        if (error) throw error;

        if (!entries || entries.length === 0) {
          return json({ success: false, error: "Secret not found or inactive" }, 404);
        }

        const entry = entries[0];

        // Check expiry
        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
          // Mark as inactive
          await supabaseAdmin.from("vault_entries").update({ is_active: false }).eq("id", entry.id);
          return json({ success: false, error: "Secret has expired" }, 410);
        }

        // Update read stats
        await supabaseAdmin
          .from("vault_entries")
          .update({
            is_revealed: true,
            read_count: (entry.read_count || 0) + 1,
            last_read_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        // Log access
        await logAccess(entry.id, entry.name, "read");
        await logActivity(`Read secret: ${entry.name}`, { service: entry.service });

        // Send notification to user
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "🔐 Secret Accessed",
          body: `Your agent read "${entry.name}" (${entry.service})`,
          type: "agent",
          source: "clawvault",
        });

        result = {
          id: entry.id,
          name: entry.name,
          service: entry.service,
          key_value: entry.key_value,  // THE ACTUAL SECRET
          description: entry.description,
          tags: entry.tags,
          read_count: (entry.read_count || 0) + 1,
        };
        break;
      }

      // ==================== READ BY SERVICE ====================
      // "Give me my Stripe key" → reads by service name
      case "read_by_service": {
        const service = params?.service as string;
        if (!service) {
          return json({ success: false, error: "service is required (e.g. openai, stripe, github)" }, 400);
        }

        const { data: entries, error } = await supabaseAdmin
          .from("vault_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("service", service.toLowerCase())
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;
        if (!entries || entries.length === 0) {
          return json({ success: false, error: `No active secret found for service: ${service}` }, 404);
        }

        const entry = entries[0];

        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
          await supabaseAdmin.from("vault_entries").update({ is_active: false }).eq("id", entry.id);
          return json({ success: false, error: "Secret has expired" }, 410);
        }

        await supabaseAdmin.from("vault_entries").update({
          is_revealed: true,
          read_count: (entry.read_count || 0) + 1,
          last_read_at: new Date().toISOString(),
        }).eq("id", entry.id);

        await logAccess(entry.id, entry.name, "read");
        await logActivity(`Read ${service} secret: ${entry.name}`, { service });

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "🔐 Secret Accessed",
          body: `Your agent read "${entry.name}" (${service})`,
          type: "agent",
          source: "clawvault",
        });

        result = {
          id: entry.id,
          name: entry.name,
          service: entry.service,
          key_value: entry.key_value,
          description: entry.description,
        };
        break;
      }

      // ==================== ROTATE SECRET ====================
      // Agent can update a secret value (e.g. after rotating an API key)
      case "rotate_secret": {
        const entryId = params?.entry_id as string;
        const newValue = params?.new_value as string;

        if (!entryId || !newValue) {
          return json({ success: false, error: "entry_id and new_value are required" }, 400);
        }

        const { data: existing } = await supabaseAdmin
          .from("vault_entries")
          .select("id, name")
          .eq("id", entryId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          return json({ success: false, error: "Secret not found" }, 404);
        }

        const { data, error } = await supabaseAdmin
          .from("vault_entries")
          .update({ key_value: newValue, read_count: 0, is_revealed: false })
          .eq("id", entryId)
          .select("id, name, service, key_prefix, key_suffix, updated_at")
          .single();

        if (error) throw error;

        await logAccess(entryId, existing.name, "rotate");
        await logActivity(`Rotated secret: ${existing.name}`, { entry_id: entryId });

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "🔄 Secret Rotated",
          body: `"${existing.name}" was rotated by your agent`,
          type: "warning",
          source: "clawvault",
        });

        result = { rotated: true, ...data };
        break;
      }

      // ==================== DELETE SECRET ====================
      case "delete_secret": {
        const entryId = params?.entry_id as string;
        if (!entryId) {
          return json({ success: false, error: "entry_id is required" }, 400);
        }

        const { data: existing } = await supabaseAdmin
          .from("vault_entries")
          .select("id, name")
          .eq("id", entryId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          return json({ success: false, error: "Secret not found" }, 404);
        }

        await supabaseAdmin.from("vault_entries").delete().eq("id", entryId);
        await logActivity(`Deleted secret: ${existing.name}`, { entry_id: entryId });

        result = { deleted: true, name: existing.name };
        break;
      }

      // ==================== WHOAMI ====================
      case "whoami": {
        const { count: secretCount } = await supabaseAdmin
          .from("vault_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_active", true);

        result = {
          user_id: userId,
          api_type: "clawvault",
          key_prefix: "cv_",
          active_secrets: secretCount ?? 0,
        };
        break;
      }

      default:
        return json({
          success: false,
          error: `Unknown action: ${action}. Available: list_secrets, read_secret, read_by_service, rotate_secret, delete_secret, whoami`,
        }, 400);
    }

    return json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: message }, 500);
  }
});
