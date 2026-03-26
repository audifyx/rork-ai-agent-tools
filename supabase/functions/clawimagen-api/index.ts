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

const STYLES = ["photorealistic", "anime", "digital-art", "oil-painting", "sketch", "cinematic", "watercolor", "3d-render"];
const SIZES = ["512x512", "768x768", "1024x1024", "1024x1792", "1792x1024"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // --- Auth via ig_ key OR ok_ master key ---
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return json({ success: false, error: "Missing API key. Use: Authorization: Bearer ig_YOUR_KEY" }, 401);

    let userId: string;

    if (apiKey.startsWith("ig_")) {
      const { data: keyRow } = await sb.from("imagegen_api_keys").select("id, user_id, is_active").eq("key_value", apiKey).maybeSingle();
      if (!keyRow) return json({ success: false, error: "Invalid API key" }, 401);
      if (!keyRow.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      userId = keyRow.user_id;
      await sb.from("imagegen_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } else if (apiKey.startsWith("ok_")) {
      // Allow master key access
      const { data: keyRow } = await sb.from("master_api_keys").select("id, user_id, is_active, permissions").eq("key_value", apiKey).maybeSingle();
      if (!keyRow) return json({ success: false, error: "Invalid master key" }, 401);
      if (!keyRow.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      const perms = keyRow.permissions as Record<string, boolean>;
      if (!perms.imagegen) return json({ success: false, error: "ImageGen access denied. Enable imagegen in your master key permissions." }, 403);
      userId = keyRow.user_id;
      await sb.from("master_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } else {
      return json({ success: false, error: "Invalid key prefix. Use ig_ (ImageGen key) or ok_ (master key)" }, 401);
    }

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    if (!action) return json({ success: false, error: "Missing 'action'" }, 400);

    const log = async (imageId: string | null, act: string, promptPreview: string | null, statusCode: number, durationMs?: number) => {
      await sb.from("imagegen_logs").insert({
        user_id: userId,
        image_id: imageId,
        action: act,
        prompt_preview: promptPreview?.slice(0, 100) || null,
        status_code: statusCode,
        duration_ms: durationMs || null,
      });
      await sb.from("agent_activity").insert({
        user_id: userId,
        tool: "clawimagen",
        action: act,
        description: promptPreview ? `Image: "${promptPreview.slice(0, 60)}..."` : act,
        icon: "🎨",
        metadata: { image_id: imageId },
      });
    };

    let result: unknown;

    // ════════════════════════════════════════
    // GENERATE — Create a new image
    // ════════════════════════════════════════
    if (action === "generate") {
      const prompt = (params?.prompt as string)?.trim();
      if (!prompt) return json({ success: false, error: "prompt is required" }, 400);
      if (prompt.length > 2000) return json({ success: false, error: "prompt too long (max 2000 chars)" }, 400);

      const negativePrompt = (params?.negative_prompt as string) || null;
      const style = (params?.style as string) || "photorealistic";
      const quality = (params?.quality as string) || "standard";
      const agentName = (params?.agent_name as string) || null;
      const tags = (params?.tags as string[]) || [];
      const sizeStr = (params?.size as string) || "1024x1024";
      const [width, height] = sizeStr.split("x").map(Number);

      if (!STYLES.includes(style)) return json({ success: false, error: `Invalid style. Choose: ${STYLES.join(", ")}` }, 400);
      if (!SIZES.includes(sizeStr)) return json({ success: false, error: `Invalid size. Choose: ${SIZES.join(", ")}` }, 400);

      // Create a pending record first so the app shows it loading
      const { data: imageRow, error: insertErr } = await sb.from("generated_images").insert({
        user_id: userId,
        prompt,
        negative_prompt: negativePrompt,
        style,
        quality,
        width: width || 1024,
        height: height || 1024,
        model: "rork-default",
        agent_name: agentName,
        tags,
        status: "generating",
      }).select().single();

      if (insertErr) throw insertErr;

      const start = Date.now();

      try {
        // ── Rork's AI toolkit will handle the actual generation ──
        // The function builds the enhanced prompt and stores the placeholder.
        // Rork installs the real image generation provider.
        // For now we store the config so the UI can trigger generation.
        const enhancedPrompt = buildPrompt(prompt, style, quality);

        // Mark as ready-for-rork (Rork's toolkit picks this up)
        await sb.from("generated_images").update({
          status: "pending",
          metadata: {
            enhanced_prompt: enhancedPrompt,
            negative_prompt: negativePrompt,
            size: sizeStr,
            style,
            quality,
            rork_ready: true,
          },
        }).eq("id", imageRow.id);

        const duration = Date.now() - start;
        await log(imageRow.id, "generate", prompt, 200, duration);

        await sb.from("notifications").insert({
          user_id: userId,
          title: "🎨 Image Queued",
          body: `"${prompt.slice(0, 60)}..." is being generated`,
          type: "agent",
          source: "clawimagen",
        });

        result = {
          id: imageRow.id,
          status: "pending",
          prompt,
          enhanced_prompt: enhancedPrompt,
          style,
          size: sizeStr,
          message: "Image queued. Rork's AI toolkit will generate it. Poll get_image for updates.",
        };
      } catch (genErr: unknown) {
        const errMsg = genErr instanceof Error ? genErr.message : "Generation failed";
        await sb.from("generated_images").update({ status: "failed", error_message: errMsg }).eq("id", imageRow.id);
        await log(imageRow.id, "generate_failed", prompt, 500);
        throw new Error(errMsg);
      }
    }

    // ════════════════════════════════════════
    // GET_IMAGE — Poll for status / get result
    // ════════════════════════════════════════
    else if (action === "get_image") {
      if (!params?.image_id) return json({ success: false, error: "image_id required" }, 400);
      const { data, error } = await sb.from("generated_images").select("*").eq("id", params.image_id as string).eq("user_id", userId).maybeSingle();
      if (error || !data) return json({ success: false, error: "Image not found" }, 404);
      result = data;
    }

    // ════════════════════════════════════════
    // LIST_IMAGES — Gallery
    // ════════════════════════════════════════
    else if (action === "list_images") {
      const limit = Math.min((params?.limit as number) || 20, 100);
      const savedOnly = params?.saved_only === true;
      const status = params?.status as string | undefined;
      const tag = params?.tag as string | undefined;

      let q = sb.from("generated_images")
        .select("id, prompt, image_url, thumbnail_url, style, width, height, status, is_saved, is_starred, agent_name, tags, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (savedOnly) q = q.eq("is_saved", true);
      if (status) q = q.eq("status", status);
      if (tag) q = q.contains("tags", [tag]);

      const { data, error } = await q;
      if (error) throw error;
      result = { images: data, count: data?.length ?? 0 };
    }

    // ════════════════════════════════════════
    // SAVE_IMAGE — Save to gallery / Supabase storage
    // ════════════════════════════════════════
    else if (action === "save_image") {
      if (!params?.image_id) return json({ success: false, error: "image_id required" }, 400);

      const { data: img } = await sb.from("generated_images").select("*").eq("id", params.image_id as string).eq("user_id", userId).maybeSingle();
      if (!img) return json({ success: false, error: "Image not found" }, 404);
      if (img.status !== "done") return json({ success: false, error: "Image not ready yet" }, 400);

      // If the image has a remote URL, download and re-upload to Supabase storage
      let storagePath = img.storage_path;
      if (img.image_url && !storagePath) {
        try {
          const imgResp = await fetch(img.image_url);
          const imgBytes = await imgResp.arrayBuffer();
          storagePath = `${userId}/${img.id}.png`;
          const { error: upErr } = await sb.storage.from("clawimagen").upload(storagePath, imgBytes, { contentType: "image/png", upsert: true });
          if (upErr) throw upErr;
        } catch {
          // Continue even if storage upload fails — still mark as saved
          storagePath = null;
        }
      }

      const { data, error } = await sb.from("generated_images").update({
        is_saved: true,
        status: "saved",
        storage_path: storagePath,
      }).eq("id", params.image_id as string).select().single();

      if (error) throw error;

      await log(params.image_id as string, "save_image", img.prompt, 200);
      await sb.from("notifications").insert({
        user_id: userId,
        title: "💾 Image Saved",
        body: `Image saved to your gallery`,
        type: "agent",
        source: "clawimagen",
      });

      result = { saved: true, ...data };
    }

    // ════════════════════════════════════════
    // UPDATE_IMAGE — Star, tag, add notes
    // ════════════════════════════════════════
    else if (action === "update_image") {
      if (!params?.image_id) return json({ success: false, error: "image_id required" }, 400);
      const u: Record<string, unknown> = {};
      for (const k of ["is_starred", "tags", "agent_name"]) {
        if (params[k] !== undefined) u[k] = params[k];
      }
      const { data, error } = await sb.from("generated_images").update(u).eq("id", params.image_id as string).eq("user_id", userId).select().single();
      if (error) throw error;
      result = data;
    }

    // ════════════════════════════════════════
    // DELETE_IMAGE — Remove from gallery
    // ════════════════════════════════════════
    else if (action === "delete_image") {
      if (!params?.image_id) return json({ success: false, error: "image_id required" }, 400);
      const { data: img } = await sb.from("generated_images").select("storage_path").eq("id", params.image_id as string).eq("user_id", userId).maybeSingle();
      if (!img) return json({ success: false, error: "Image not found" }, 404);
      if (img.storage_path) {
        await sb.storage.from("clawimagen").remove([img.storage_path]);
      }
      await sb.from("generated_images").delete().eq("id", params.image_id as string).eq("user_id", userId);
      await log(params.image_id as string, "delete_image", null, 200);
      result = { deleted: true };
    }

    // ════════════════════════════════════════
    // GET_STATS — Generation analytics
    // ════════════════════════════════════════
    else if (action === "get_stats") {
      const [{ count: total }, { count: saved }, { count: generating }, { data: recent }] = await Promise.all([
        sb.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_saved", true),
        sb.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "generating"),
        sb.from("generated_images").select("style").eq("user_id", userId).eq("status", "done"),
      ]);

      const styleCounts: Record<string, number> = {};
      for (const r of recent || []) {
        styleCounts[r.style] = (styleCounts[r.style] || 0) + 1;
      }

      result = {
        total_generated: total ?? 0,
        total_saved: saved ?? 0,
        currently_generating: generating ?? 0,
        style_breakdown: styleCounts,
        favorite_style: Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      };
    }

    // ════════════════════════════════════════
    // GET_DOWNLOAD_URL — Signed URL for download
    // ════════════════════════════════════════
    else if (action === "get_download_url") {
      if (!params?.image_id) return json({ success: false, error: "image_id required" }, 400);
      const { data: img } = await sb.from("generated_images").select("storage_path, image_url").eq("id", params.image_id as string).eq("user_id", userId).maybeSingle();
      if (!img) return json({ success: false, error: "Image not found" }, 404);
      if (img.storage_path) {
        const { data: urlData } = await sb.storage.from("clawimagen").createSignedUrl(img.storage_path, 3600);
        result = { download_url: urlData?.signedUrl ?? img.image_url, expires_in: 3600 };
      } else {
        result = { download_url: img.image_url, expires_in: null };
      }
    }

    // ════════════════════════════════════════
    // WHOAMI
    // ════════════════════════════════════════
    else if (action === "whoami") {
      const { count } = await sb.from("generated_images").select("id", { count: "exact", head: true }).eq("user_id", userId);
      result = {
        user_id: userId,
        api_type: "clawimagen",
        total_images: count ?? 0,
        supported_styles: STYLES,
        supported_sizes: SIZES,
        key_prefix: apiKey.startsWith("ok_") ? "ok_" : "ig_",
      };
    }

    else {
      return json({ success: false, error: `Unknown action: ${action}. Available: generate, get_image, list_images, save_image, update_image, delete_image, get_stats, get_download_url, whoami` }, 400);
    }

    return json({ success: true, data: result });
  } catch (err: unknown) {
    return json({ success: false, error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});

// ── Prompt builder — enriches prompts with style directives ──
function buildPrompt(prompt: string, style: string, quality: string): string {
  const styleDirectives: Record<string, string> = {
    "photorealistic": "photorealistic, ultra-detailed, 8k resolution, sharp focus, professional photography",
    "anime": "anime style, vibrant colors, clean line art, Studio Ghibli quality, detailed",
    "digital-art": "digital art, concept art, artstation trending, highly detailed, vibrant",
    "oil-painting": "oil painting, traditional art, masterpiece, museum quality, rich textures, detailed brushwork",
    "sketch": "pencil sketch, detailed linework, professional illustration, clean composition",
    "cinematic": "cinematic photography, movie still, dramatic lighting, anamorphic lens, film grain",
    "watercolor": "watercolor painting, soft edges, flowing colors, artistic, professional illustration",
    "3d-render": "3D render, octane render, detailed textures, studio lighting, photorealistic",
  };

  const qualityAddons = quality === "hd"
    ? ", HDR, high dynamic range, ultra-high quality, masterpiece"
    : ", high quality";

  const directive = styleDirectives[style] || styleDirectives["photorealistic"];
  return `${prompt}, ${directive}${qualityAddons}`;
}
