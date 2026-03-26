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

// ── Built-in HTML background presets the agent can use by name ──
const PRESETS: Record<string, string> = {

  "matrix": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const cols=Math.floor(c.width/16),drops=Array(cols).fill(1);
const chars='アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF0123456789';
setInterval(()=>{
  x.fillStyle='rgba(0,0,0,0.05)';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#DC2626';x.font='16px monospace';
  drops.forEach((y,i)=>{
    x.fillText(chars[Math.floor(Math.random()*chars.length)],i*16,y*16);
    if(y*16>c.height&&Math.random()>.975)drops[i]=0;
    drops[i]++;
  });
},35);
</script></body></html>`,

  "particles": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const pts=Array.from({length:80},()=>({
  x:Math.random()*c.width,y:Math.random()*c.height,
  vx:(Math.random()-.5)*0.8,vy:(Math.random()-.5)*0.8,
  r:Math.random()*3+1
}));
function draw(){
  x.fillStyle='rgba(0,0,0,0.15)';x.fillRect(0,0,c.width,c.height);
  pts.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>c.width)p.vx*=-1;
    if(p.y<0||p.y>c.height)p.vy*=-1;
    x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);
    x.fillStyle='#DC2626';x.fill();
    pts.forEach(q=>{
      const d=Math.hypot(p.x-q.x,p.y-q.y);
      if(d<120){x.strokeStyle=`rgba(220,38,38,${1-d/120})`;
      x.lineWidth=0.5;x.beginPath();x.moveTo(p.x,p.y);
      x.lineTo(q.x,q.y);x.stroke();}
    });
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "aurora": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000014">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
let t=0;
function draw(){
  x.fillStyle='rgba(0,0,20,0.1)';x.fillRect(0,0,c.width,c.height);
  for(let i=0;i<5;i++){
    const g=x.createLinearGradient(0,c.height*.3+Math.sin(t+i)*100,0,c.height*.8);
    g.addColorStop(0,'rgba(220,38,38,0)');
    g.addColorStop(0.5,`rgba(${100+i*30},${10+i*20},${200-i*30},0.15)`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g;
    x.beginPath();x.moveTo(0,c.height);
    for(let px=0;px<=c.width;px+=10){
      x.lineTo(px,c.height*.5+Math.sin(px*.005+t+i)*80+Math.cos(px*.003-t)*60);
    }
    x.lineTo(c.width,c.height);x.closePath();x.fill();
  }
  t+=0.01;requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "mesh-grid": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const S=60;let t=0;
function draw(){
  x.fillStyle='rgba(0,0,0,0.08)';x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='rgba(220,38,38,0.25)';x.lineWidth=0.5;
  for(let i=0;i<=c.width/S+1;i++){
    for(let j=0;j<=c.height/S+1;j++){
      const wave=Math.sin(i*.5+t)*10+Math.cos(j*.5+t)*10;
      x.beginPath();
      x.arc(i*S,j*S+wave,1.5+Math.abs(Math.sin(t+i+j)),0,Math.PI*2);
      x.strokeStyle=`rgba(220,38,38,${0.1+Math.abs(Math.sin(t+i+j))*0.4})`;
      x.stroke();
    }
  }
  t+=0.02;requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "fire": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
let t=0;
function draw(){
  x.fillStyle='rgba(0,0,0,0.08)';x.fillRect(0,0,c.width,c.height);
  for(let i=0;i<12;i++){
    const cx=c.width*.5+Math.sin(t*.7+i)*c.width*.35;
    const cy=c.height*.7+Math.cos(t*.5+i)*c.height*.1;
    const r=80+Math.sin(t*2+i)*40;
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'rgba(255,200,50,0.4)');
    g.addColorStop(0.3,'rgba(220,38,38,0.3)');
    g.addColorStop(0.7,'rgba(150,0,0,0.1)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
  }
  t+=0.015;requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "starfield": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const stars=Array.from({length:200},()=>({
  x:Math.random()*c.width-c.width/2,
  y:Math.random()*c.height-c.height/2,
  z:Math.random()*c.width
}));
function draw(){
  x.fillStyle='rgba(0,0,0,0.2)';x.fillRect(0,0,c.width,c.height);
  stars.forEach(s=>{
    s.z-=2;if(s.z<=0)s.z=c.width;
    const px=s.x/s.z*c.width+c.width/2;
    const py=s.y/s.z*c.height+c.height/2;
    const r=Math.max(0.1,(1-s.z/c.width)*3);
    const bright=Math.floor((1-s.z/c.width)*255);
    x.fillStyle=`rgb(${bright},${Math.floor(bright*.15)},${Math.floor(bright*.15)})`;
    x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "pulse": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
let t=0;
function draw(){
  x.fillStyle='rgba(0,0,0,0.05)';x.fillRect(0,0,c.width,c.height);
  for(let i=0;i<8;i++){
    const r=(t*60+i*80)%(Math.max(c.width,c.height)*1.5);
    const alpha=Math.max(0,1-r/(Math.max(c.width,c.height)*0.8));
    x.strokeStyle=`rgba(220,38,38,${alpha*0.6})`;
    x.lineWidth=2;x.beginPath();
    x.arc(c.width/2,c.height/2,r,0,Math.PI*2);x.stroke();
  }
  t+=0.008;requestAnimationFrame(draw);
}
draw();
</script></body></html>`,

  "noise": `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000">
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
function noise(x,y,t){
  return Math.sin(x*.01+t)*Math.cos(y*.01+t*.7)+
         Math.sin(x*.02-t*.5)*Math.cos(y*.015+t*.3)+
         Math.sin((x+y)*.008+t*.4);
}
let t=0;
function draw(){
  const img=x.createImageData(c.width,c.height);
  for(let i=0;i<c.width;i+=3){
    for(let j=0;j<c.height;j+=3){
      const n=(noise(i,j,t)+2)/4;
      const idx=(j*c.width+i)*4;
      img.data[idx]=Math.floor(n*220);
      img.data[idx+1]=Math.floor(n*10);
      img.data[idx+2]=Math.floor(n*20);
      img.data[idx+3]=255;
    }
  }
  x.putImageData(img,0,0);
  t+=0.02;requestAnimationFrame(draw);
}
draw();
</script></body></html>`,
};

const PRESET_NAMES = Object.keys(PRESETS);

// ── AI-powered HTML generation using the Rork toolkit ──
async function generateHTMLBackground(prompt: string, toolkitBaseUrl: string): Promise<string> {
  // Build a system prompt that generates self-contained animated HTML
  const systemPrompt = `You are an expert creative coder specializing in animated HTML canvas backgrounds.
Generate a COMPLETE, self-contained HTML file for a mobile app background.

REQUIREMENTS:
- Single HTML file, no external dependencies
- Full-screen canvas animation (width=window.innerWidth, height=window.innerHeight)
- Dark theme (background #000 or very dark)
- Use red (#DC2626) as the primary accent color to match the OpenClaw brand
- Smooth 60fps animation using requestAnimationFrame
- Performance optimized for mobile WebView
- Must look stunning as an app background — subtle enough to not distract
- Include slight fade/trail effect (fillStyle with low alpha for trails)

OUTPUT: Return ONLY the complete HTML. No explanation, no markdown, no code fences.`;

  const userPrompt = `Create an animated HTML canvas background: ${prompt}

Requirements:
- Dark background (#000 or very dark)  
- Red accent color #DC2626
- Full-screen, smooth animation
- Mobile-optimized
- Output ONLY the HTML file content`;

  const response = await fetch(`${toolkitBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "anthropic/claude-3-5-haiku",
      max_tokens: 3000,
    }),
  });

  if (!response.ok) throw new Error(`AI generation failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const html = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!html || !html.includes("<html")) throw new Error("Invalid HTML returned from AI");
  return html;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const TOOLKIT_BASE_URL = (Deno.env.get("EXPO_PUBLIC_TOOLKIT_URL") ?? "https://toolkit.rork.com").replace(/\/$/, "");

  try {
    // ── Auth: bg_ key OR ok_ master key ──
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return json({ success: false, error: "Missing API key. Use: Authorization: Bearer bg_YOUR_KEY or ok_YOUR_KEY" }, 401);

    let userId: string;

    if (apiKey.startsWith("bg_")) {
      const { data: keyRow } = await sb.from("clawbg_api_keys")
        .select("id, user_id, is_active")
        .eq("key_value", apiKey)
        .maybeSingle();
      if (!keyRow) return json({ success: false, error: "Invalid bg_ API key" }, 401);
      if (!keyRow.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      userId = keyRow.user_id;
      await sb.from("clawbg_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } else if (apiKey.startsWith("ok_")) {
      const { data: keyRow } = await sb.from("master_api_keys")
        .select("id, user_id, is_active, permissions")
        .eq("key_value", apiKey)
        .maybeSingle();
      if (!keyRow) return json({ success: false, error: "Invalid master key" }, 401);
      if (!keyRow.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      const perms = keyRow.permissions as Record<string, boolean>;
      if (!perms.clawbg) return json({ success: false, error: "ClawBG access denied. Enable clawbg in your master key permissions." }, 403);
      userId = keyRow.user_id;
      await sb.from("master_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
    } else {
      return json({ success: false, error: "Invalid key. Use bg_ (ClawBG key) or ok_ (master key)" }, 401);
    }

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    if (!action) return json({ success: false, error: "Missing 'action'" }, 400);

    // ── Logging helpers ──
    const log = async (act: string, desc: string, bgId: string | null = null, meta: Record<string, unknown> = {}) => {
      await sb.from("clawbg_logs").insert({
        user_id: userId,
        action: act,
        description: desc,
        bg_id: bgId,
        metadata: meta,
      });
      await sb.from("agent_activity").insert({
        user_id: userId,
        tool: "clawbg",
        action: act,
        description: desc,
        icon: "🎨",
        metadata: { bg_id: bgId, ...meta },
      });
    };

    const notify = async (title: string, body: string) => {
      await sb.from("notifications").insert({
        user_id: userId, title, body, type: "agent", source: "clawbg",
      });
    };

    let result: unknown;

    // ════════════════════════════════════════
    // SET_PRESET — Apply a built-in background
    // Agent says: { action: "set_preset", params: { preset: "matrix" } }
    // ════════════════════════════════════════
    if (action === "set_preset") {
      const preset = (params?.preset as string)?.toLowerCase();
      if (!preset) return json({ success: false, error: "preset is required" }, 400);
      if (!PRESETS[preset]) {
        return json({
          success: false,
          error: `Unknown preset "${preset}". Available: ${PRESET_NAMES.join(", ")}`,
        }, 400);
      }

      const html = PRESETS[preset];

      // Upsert active background
      const { data, error } = await sb.from("clawbg_backgrounds")
        .upsert({
          user_id: userId,
          name: preset,
          type: "preset",
          html_content: html,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select().single();

      if (error) throw error;

      await log("set_preset", `Background set to preset: ${preset}`, data.id, { preset });
      await notify("🎨 Background Updated", `App background changed to "${preset}" preset`);

      result = {
        id: data.id,
        preset,
        type: "preset",
        active: true,
        message: `Background set to "${preset}". The app will update on next load.`,
        preview_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/clawbg-api/preview/${data.id}`,
      };
    }

    // ════════════════════════════════════════
    // GENERATE — AI creates custom HTML background from text prompt
    // Agent says: { action: "generate", params: { prompt: "spinning galaxy with red stars" } }
    // ════════════════════════════════════════
    else if (action === "generate") {
      const prompt = (params?.prompt as string)?.trim();
      if (!prompt) return json({ success: false, error: "prompt is required" }, 400);
      if (prompt.length > 500) return json({ success: false, error: "prompt too long (max 500 chars)" }, 400);

      const name = (params?.name as string) || prompt.slice(0, 40);
      const setActive = params?.set_active !== false; // default true

      // Insert pending record
      const { data: bgRow, error: insertErr } = await sb.from("clawbg_backgrounds").insert({
        user_id: userId,
        name,
        type: "generated",
        prompt,
        html_content: "",
        status: "generating",
        is_active: false,
      }).select().single();

      if (insertErr) throw insertErr;

      try {
        const html = await generateHTMLBackground(prompt, TOOLKIT_BASE_URL);

        const updatePayload: Record<string, unknown> = {
          html_content: html,
          status: "done",
          updated_at: new Date().toISOString(),
        };
        if (setActive) updatePayload.is_active = true;

        await sb.from("clawbg_backgrounds").update(updatePayload).eq("id", bgRow.id);

        // If setting active, deactivate others
        if (setActive) {
          await sb.from("clawbg_backgrounds")
            .update({ is_active: false })
            .eq("user_id", userId)
            .neq("id", bgRow.id);
        }

        await log("generate", `Generated background: "${name}"`, bgRow.id, { prompt });
        await notify("🎨 Background Generated", `"${name}" is ready — app background updated`);

        result = {
          id: bgRow.id,
          name,
          type: "generated",
          prompt,
          status: "done",
          is_active: setActive,
          html_length: html.length,
          message: `Background "${name}" generated${setActive ? " and set as active" : ""}. App will update on next load.`,
          preview_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/clawbg-api/preview/${bgRow.id}`,
        };
      } catch (genErr) {
        const errMsg = genErr instanceof Error ? genErr.message : "Generation failed";
        await sb.from("clawbg_backgrounds").update({ status: "failed", error_message: errMsg }).eq("id", bgRow.id);
        throw new Error(errMsg);
      }
    }

    // ════════════════════════════════════════
    // SET_CUSTOM — Push raw HTML directly (power users / agent with code)
    // Agent says: { action: "set_custom", params: { html: "<!DOCTYPE html>...", name: "my bg" } }
    // ════════════════════════════════════════
    else if (action === "set_custom") {
      const html = (params?.html as string)?.trim();
      const name = (params?.name as string) || "Custom Background";
      if (!html) return json({ success: false, error: "html is required" }, 400);
      if (!html.includes("<html") && !html.includes("<canvas")) {
        return json({ success: false, error: "html must contain valid HTML with <html> or <canvas>" }, 400);
      }
      if (html.length > 100000) return json({ success: false, error: "HTML too large (max 100KB)" }, 400);

      // Deactivate others
      await sb.from("clawbg_backgrounds").update({ is_active: false }).eq("user_id", userId);

      const { data, error } = await sb.from("clawbg_backgrounds").insert({
        user_id: userId,
        name,
        type: "custom",
        html_content: html,
        is_active: true,
        status: "done",
      }).select().single();

      if (error) throw error;

      await log("set_custom", `Custom HTML background set: "${name}"`, data.id, { html_length: html.length });
      await notify("🎨 Custom Background Applied", `"${name}" is now your active background`);

      result = {
        id: data.id,
        name,
        type: "custom",
        active: true,
        html_length: html.length,
        message: `Custom background "${name}" applied. App will update on next load.`,
      };
    }

    // ════════════════════════════════════════
    // GET_ACTIVE — Get the currently active background HTML
    // App calls this on load to get its wallpaper
    // ════════════════════════════════════════
    else if (action === "get_active") {
      const { data, error } = await sb.from("clawbg_backgrounds")
        .select("id, name, type, preset, html_content, updated_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ success: true, data: null, message: "No active background set" });

      result = data;
    }

    // ════════════════════════════════════════
    // LIST — All saved backgrounds
    // ════════════════════════════════════════
    else if (action === "list") {
      const { data, error } = await sb.from("clawbg_backgrounds")
        .select("id, name, type, preset, prompt, is_active, status, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      result = { backgrounds: data, count: data?.length ?? 0 };
    }

    // ════════════════════════════════════════
    // ACTIVATE — Switch to a previously saved background
    // ════════════════════════════════════════
    else if (action === "activate") {
      if (!params?.bg_id) return json({ success: false, error: "bg_id required" }, 400);

      const { data: bg } = await sb.from("clawbg_backgrounds")
        .select("id, name, status")
        .eq("id", params.bg_id as string)
        .eq("user_id", userId)
        .maybeSingle();

      if (!bg) return json({ success: false, error: "Background not found" }, 404);
      if (bg.status !== "done") return json({ success: false, error: "Background is not ready yet" }, 400);

      await sb.from("clawbg_backgrounds").update({ is_active: false }).eq("user_id", userId);
      await sb.from("clawbg_backgrounds").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", params.bg_id as string);

      await log("activate", `Activated background: "${bg.name}"`, bg.id);
      await notify("🎨 Background Switched", `"${bg.name}" is now active`);

      result = { activated: true, id: bg.id, name: bg.name };
    }

    // ════════════════════════════════════════
    // DELETE — Remove a saved background
    // ════════════════════════════════════════
    else if (action === "delete") {
      if (!params?.bg_id) return json({ success: false, error: "bg_id required" }, 400);

      const { data: bg } = await sb.from("clawbg_backgrounds")
        .select("id, name")
        .eq("id", params.bg_id as string)
        .eq("user_id", userId)
        .maybeSingle();

      if (!bg) return json({ success: false, error: "Background not found" }, 404);

      await sb.from("clawbg_backgrounds").delete().eq("id", params.bg_id as string);
      await log("delete", `Deleted background: "${bg.name}"`, bg.id);

      result = { deleted: true, id: bg.id };
    }

    // ════════════════════════════════════════
    // LIST_PRESETS — Show all built-in options
    // ════════════════════════════════════════
    else if (action === "list_presets") {
      result = {
        presets: PRESET_NAMES.map(name => ({
          name,
          description: {
            matrix: "Falling red characters, Matrix-style rain",
            particles: "Connected floating particles with red links",
            aurora: "Flowing northern lights in red/purple tones",
            "mesh-grid": "Animated dot grid with wave distortion",
            fire: "Glowing fire orbs with ember effect",
            starfield: "3D star tunnel flying through space",
            pulse: "Expanding red radar pulse rings",
            noise: "Organic flowing red noise plasma",
          }[name] ?? name,
        })),
        count: PRESET_NAMES.length,
      };
    }

    // ════════════════════════════════════════
    // WHOAMI
    // ════════════════════════════════════════
    else if (action === "whoami") {
      const { count } = await sb.from("clawbg_backgrounds")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      result = {
        user_id: userId,
        tool: "clawbg",
        total_backgrounds: count ?? 0,
        available_presets: PRESET_NAMES,
        supported_actions: [
          "set_preset", "generate", "set_custom",
          "get_active", "list", "activate", "delete",
          "list_presets", "whoami",
        ],
        key_prefix: apiKey.startsWith("ok_") ? "ok_" : "bg_",
      };
    }

    else {
      return json({
        success: false,
        error: `Unknown action: "${action}". Available: set_preset, generate, set_custom, get_active, list, activate, delete, list_presets, whoami`,
      }, 400);
    }

    return json({ success: true, data: result });

  } catch (err: unknown) {
    console.error("[clawbg-api] Error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
