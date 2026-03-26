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

function getPreset(name: string): string {
  const presets: Record<string, string[]> = {
    matrix: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;",
      "const cols=Math.floor(c.width/16),drops=Array(cols).fill(1);",
      "const chars='ABCDEF0123456789アイウエオカキクケコ';",
      "setInterval(()=>{x.fillStyle='rgba(0,0,0,0.05)';x.fillRect(0,0,c.width,c.height);",
      "x.fillStyle='#DC2626';x.font='16px monospace';",
      "drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*16,y*16);",
      "if(y*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]++;});},35);",
      "</" + "script></body></html>",
    ],
    particles: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;",
      "const pts=Array.from({length:80},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,r:Math.random()*3+1}));",
      "function draw(){x.fillStyle='rgba(0,0,0,0.15)';x.fillRect(0,0,c.width,c.height);",
      "pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;",
      "if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;",
      "x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fillStyle='#DC2626';x.fill();",
      "pts.forEach(q=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<120){",
      "x.strokeStyle='rgba(220,38,38,'+(1-d/120).toFixed(2)+')';",
      "x.lineWidth=.5;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke();}});});",
      "requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    aurora: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000014'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;let t=0;",
      "function draw(){x.fillStyle='rgba(0,0,20,0.1)';x.fillRect(0,0,c.width,c.height);",
      "for(let i=0;i<5;i++){const r=100+i*30,g=10+i*20,b=200-i*30;",
      "const gr=x.createLinearGradient(0,c.height*.3+Math.sin(t+i)*100,0,c.height*.8);",
      "gr.addColorStop(0,'rgba(220,38,38,0)');",
      "gr.addColorStop(.5,'rgba('+r+','+g+','+b+',.15)');",
      "gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.beginPath();x.moveTo(0,c.height);",
      "for(let p=0;p<=c.width;p+=10)x.lineTo(p,c.height*.5+Math.sin(p*.005+t+i)*80+Math.cos(p*.003-t)*60);",
      "x.lineTo(c.width,c.height);x.closePath();x.fill();}t+=.01;requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    "mesh-grid": [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;const S=60;let t=0;",
      "function draw(){x.fillStyle='rgba(0,0,0,0.08)';x.fillRect(0,0,c.width,c.height);",
      "for(let i=0;i<=c.width/S+1;i++)for(let j=0;j<=c.height/S+1;j++){",
      "const w=Math.sin(i*.5+t)*10+Math.cos(j*.5+t)*10;",
      "const a=(0.1+Math.abs(Math.sin(t+i+j))*.4).toFixed(2);",
      "x.beginPath();x.arc(i*S,j*S+w,1.5+Math.abs(Math.sin(t+i+j)),0,Math.PI*2);",
      "x.strokeStyle='rgba(220,38,38,'+a+')';x.stroke();}",
      "t+=.02;requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    fire: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;let t=0;",
      "function draw(){x.fillStyle='rgba(0,0,0,0.08)';x.fillRect(0,0,c.width,c.height);",
      "for(let i=0;i<12;i++){const cx=c.width*.5+Math.sin(t*.7+i)*c.width*.35;",
      "const cy=c.height*.7+Math.cos(t*.5+i)*c.height*.1;const r=80+Math.sin(t*2+i)*40;",
      "const g=x.createRadialGradient(cx,cy,0,cx,cy,r);",
      "g.addColorStop(0,'rgba(255,200,50,.4)');g.addColorStop(.3,'rgba(220,38,38,.3)');",
      "g.addColorStop(.7,'rgba(150,0,0,.1)');g.addColorStop(1,'rgba(0,0,0,0)');",
      "x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}",
      "t+=.015;requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    starfield: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;",
      "const s=Array.from({length:200},()=>({x:Math.random()*c.width-c.width/2,y:Math.random()*c.height-c.height/2,z:Math.random()*c.width}));",
      "function draw(){x.fillStyle='rgba(0,0,0,0.2)';x.fillRect(0,0,c.width,c.height);",
      "s.forEach(p=>{p.z-=2;if(p.z<=0)p.z=c.width;",
      "const px=p.x/p.z*c.width+c.width/2,py=p.y/p.z*c.height+c.height/2;",
      "const r=Math.max(.1,(1-p.z/c.width)*3),b=Math.floor((1-p.z/c.width)*255);",
      "x.fillStyle='rgb('+b+','+Math.floor(b*.15)+','+Math.floor(b*.15)+')';",
      "x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();});requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    pulse: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;let t=0;",
      "function draw(){x.fillStyle='rgba(0,0,0,0.05)';x.fillRect(0,0,c.width,c.height);",
      "for(let i=0;i<8;i++){const r=(t*60+i*80)%(Math.max(c.width,c.height)*1.5);",
      "const a=Math.max(0,1-r/(Math.max(c.width,c.height)*.8));",
      "x.strokeStyle='rgba(220,38,38,'+a.toFixed(2)+')';x.lineWidth=2;",
      "x.beginPath();x.arc(c.width/2,c.height/2,r,0,Math.PI*2);x.stroke();}",
      "t+=.008;requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
    noise: [
      "<!DOCTYPE html><html><body style='margin:0;overflow:hidden;background:#000'>",
      "<canvas id='c'></canvas><script>",
      "const c=document.getElementById('c'),x=c.getContext('2d');",
      "c.width=window.innerWidth;c.height=window.innerHeight;",
      "function noise(px,py,t){return Math.sin(px*.01+t)*Math.cos(py*.01+t*.7)+Math.sin(px*.02-t*.5)*Math.cos(py*.015+t*.3)+Math.sin((px+py)*.008+t*.4);}",
      "let t=0;function draw(){const img=x.createImageData(c.width,c.height);",
      "for(let i=0;i<c.width;i+=3)for(let j=0;j<c.height;j+=3){",
      "const n=(noise(i,j,t)+2)/4,idx=(j*c.width+i)*4;",
      "img.data[idx]=Math.floor(n*220);img.data[idx+1]=Math.floor(n*10);",
      "img.data[idx+2]=Math.floor(n*20);img.data[idx+3]=255;}",
      "x.putImageData(img,0,0);t+=.02;requestAnimationFrame(draw);}draw();",
      "</" + "script></body></html>",
    ],
  };
  return (presets[name] || []).join("\n");
}

const PRESET_NAMES = ["matrix","particles","aurora","mesh-grid","fire","starfield","pulse","noise"];
const PRESET_DESCS: Record<string,string> = {
  matrix:"Falling red characters, Matrix-style rain",
  particles:"Connected floating particles with red links",
  aurora:"Flowing northern lights in red/purple tones",
  "mesh-grid":"Animated dot grid with wave distortion",
  fire:"Glowing fire orbs with ember effect",
  starfield:"3D star tunnel flying through space",
  pulse:"Expanding red radar pulse rings",
  noise:"Organic flowing red noise plasma",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return json({ success: false, error: "Missing API key" }, 401);

    let userId: string;
    if (apiKey.startsWith("bg_")) {
      const { data: k } = await sb.from("clawbg_api_keys").select("id,user_id,is_active").eq("key_value", apiKey).maybeSingle();
      if (!k) return json({ success: false, error: "Invalid bg_ key" }, 401);
      if (!k.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      userId = k.user_id;
      await sb.from("clawbg_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
    } else if (apiKey.startsWith("ok_")) {
      const { data: k } = await sb.from("master_api_keys").select("id,user_id,is_active,permissions").eq("key_value", apiKey).maybeSingle();
      if (!k) return json({ success: false, error: "Invalid master key" }, 401);
      if (!k.is_active) return json({ success: false, error: "Key deactivated" }, 403);
      const perms = k.permissions as Record<string,boolean>;
      if (!perms.clawbg) return json({ success: false, error: "ClawBG access denied" }, 403);
      userId = k.user_id;
      await sb.from("master_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
    } else {
      return json({ success: false, error: "Use bg_ or ok_ key" }, 401);
    }

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string,unknown> };
    if (!action) return json({ success: false, error: "Missing action" }, 400);

    const log = async (act: string, desc: string, bgId: string|null=null, meta: Record<string,unknown>={}) => {
      await sb.from("clawbg_logs").insert({ user_id: userId, action: act, description: desc, bg_id: bgId, metadata: meta });
      await sb.from("agent_activity").insert({ user_id: userId, tool: "clawbg", action: act, description: desc, icon: "🎨", metadata: { bg_id: bgId, ...meta } });
    };
    const notify = async (title: string, msg: string) => {
      await sb.from("notifications").insert({ user_id: userId, title, body: msg, type: "agent", source: "clawbg" });
    };

    let result: unknown;

    if (action === "set_preset") {
      const preset = (params?.preset as string)?.toLowerCase();
      if (!preset) return json({ success: false, error: "preset required" }, 400);
      const html = getPreset(preset);
      if (!html) return json({ success: false, error: `Unknown preset. Available: ${PRESET_NAMES.join(", ")}` }, 400);
      await sb.from("clawbg_backgrounds").update({ is_active: false }).eq("user_id", userId);
      const { data, error } = await sb.from("clawbg_backgrounds").insert({ user_id: userId, name: preset, type: "preset", preset, html_content: html, is_active: true, status: "done" }).select().single();
      if (error) throw error;
      await log("set_preset", `Preset: ${preset}`, data.id, { preset });
      await notify("🎨 Background Updated", `App background set to "${preset}"`);
      result = { id: data.id, preset, active: true, message: `Set to "${preset}". App updates live.` };
    }

    else if (action === "set_custom") {
      const html = (params?.html as string)?.trim();
      const name = (params?.name as string) || "Custom";
      if (!html) return json({ success: false, error: "html required" }, 400);
      if (html.length > 100000) return json({ success: false, error: "HTML too large (max 100KB)" }, 400);
      await sb.from("clawbg_backgrounds").update({ is_active: false }).eq("user_id", userId);
      const { data, error } = await sb.from("clawbg_backgrounds").insert({ user_id: userId, name, type: "custom", html_content: html, is_active: true, status: "done" }).select().single();
      if (error) throw error;
      await log("set_custom", `Custom: "${name}"`, data.id);
      await notify("🎨 Custom Background Applied", `"${name}" is active`);
      result = { id: data.id, name, active: true, message: `"${name}" applied. App updates live.` };
    }

    else if (action === "get_active") {
      const { data, error } = await sb.from("clawbg_backgrounds").select("id,name,type,preset,html_content,updated_at").eq("user_id", userId).eq("is_active", true).eq("status", "done").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      result = data ?? null;
    }

    else if (action === "list") {
      const { data, error } = await sb.from("clawbg_backgrounds").select("id,name,type,preset,prompt,is_active,status,created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      result = { backgrounds: data, count: data?.length ?? 0 };
    }

    else if (action === "activate") {
      if (!params?.bg_id) return json({ success: false, error: "bg_id required" }, 400);
      const { data: bg } = await sb.from("clawbg_backgrounds").select("id,name,status").eq("id", params.bg_id as string).eq("user_id", userId).maybeSingle();
      if (!bg) return json({ success: false, error: "Not found" }, 404);
      await sb.from("clawbg_backgrounds").update({ is_active: false }).eq("user_id", userId);
      await sb.from("clawbg_backgrounds").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", params.bg_id as string);
      await log("activate", `Activated: "${bg.name}"`, bg.id);
      await notify("🎨 Background Switched", `"${bg.name}" is active`);
      result = { activated: true, id: bg.id, name: bg.name };
    }

    else if (action === "delete") {
      if (!params?.bg_id) return json({ success: false, error: "bg_id required" }, 400);
      const { data: bg } = await sb.from("clawbg_backgrounds").select("id,name").eq("id", params.bg_id as string).eq("user_id", userId).maybeSingle();
      if (!bg) return json({ success: false, error: "Not found" }, 404);
      await sb.from("clawbg_backgrounds").delete().eq("id", params.bg_id as string);
      await log("delete", `Deleted: "${bg.name}"`, bg.id);
      result = { deleted: true, id: bg.id };
    }

    else if (action === "list_presets") {
      result = { presets: PRESET_NAMES.map(n => ({ name: n, description: PRESET_DESCS[n] })), count: PRESET_NAMES.length };
    }

    else if (action === "whoami") {
      const { count } = await sb.from("clawbg_backgrounds").select("id", { count: "exact", head: true }).eq("user_id", userId);
      result = { user_id: userId, tool: "clawbg", total_backgrounds: count ?? 0, available_presets: PRESET_NAMES, supported_actions: ["set_preset","set_custom","get_active","list","activate","delete","list_presets","whoami"] };
    }

    else {
      return json({ success: false, error: `Unknown action: "${action}"` }, 400);
    }

    return json({ success: true, data: result });
  } catch (err: unknown) {
    return json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
