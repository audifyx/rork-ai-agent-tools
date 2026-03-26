// ── Add this to openclaw-master/index.ts in the DOCS / WHOAMI section ──
// Paste into the existing docs action alongside the other tools

// ════════════════════════════════════════
// CLAWBG — Agent-Controlled App Backgrounds
// ════════════════════════════════════════
const CLAWBG_DOCS = `
## 🎨 ClawBG — Animated HTML App Backgrounds

Control the app's animated background wallpaper in real time.
Uses HTML5 Canvas animations rendered in a WebView layer behind the UI.

**Endpoint:** POST /functions/v1/clawbg-api
**Auth:** Authorization: Bearer ok_YOUR_KEY  (requires clawbg permission)

---

### set_preset — Apply a built-in background instantly

\`\`\`json
{
  "action": "set_preset",
  "params": { "preset": "matrix" }
}
\`\`\`

**Available presets:**
- matrix      — Falling red characters (Matrix rain)
- particles   — Connected floating particle network
- aurora      — Flowing northern lights in red/purple
- mesh-grid   — Animated dot grid with wave distortion
- fire        — Glowing fire orbs with ember effect
- starfield   — 3D star tunnel through space
- pulse       — Expanding radar pulse rings
- noise       — Organic flowing red plasma

---

### generate — AI generates a custom animated background from your description

\`\`\`json
{
  "action": "generate",
  "params": {
    "prompt": "spinning galaxy with red stars and nebula clouds",
    "name": "Galaxy",
    "set_active": true
  }
}
\`\`\`

Tips for great prompts:
- Be specific about motion: "slowly rotating", "fast pulsing", "gently floating"
- Mention colors: "red and black", "dark blue with crimson accents"
- Describe the feel: "cosmic", "glitchy", "organic", "geometric"
- Keep it abstract — no faces, text, or logos

---

### set_custom — Push your own HTML canvas code directly

\`\`\`json
{
  "action": "set_custom",
  "params": {
    "name": "My Custom BG",
    "html": "<!DOCTYPE html><html><body style='margin:0;background:#000'>...</body></html>"
  }
}
\`\`\`

Requirements for custom HTML:
- Must contain <html> or <canvas> tag
- No external scripts or images (self-contained only)
- Max 100KB
- Use window.innerWidth / window.innerHeight for full screen
- Target 60fps with requestAnimationFrame

---

### get_active — Get the currently active background

\`\`\`json
{ "action": "get_active" }
\`\`\`

Returns: id, name, type, html_content, updated_at

---

### list — See all saved backgrounds

\`\`\`json
{ "action": "list" }
\`\`\`

---

### activate — Switch to a previously saved background

\`\`\`json
{
  "action": "activate",
  "params": { "bg_id": "uuid-here" }
}
\`\`\`

---

### list_presets — See all built-in preset options

\`\`\`json
{ "action": "list_presets" }
\`\`\`

---

**Permission required:** Your ok_ master key must have \`"clawbg": true\` in permissions.

**Real-time:** The app updates the background immediately via Supabase Realtime — 
no reload needed. The user sees the change within seconds of your call.
`;

// ── Add to master permissions check in openclaw-master/index.ts ──
// In the existing permissions object, add:
//   clawbg: keyRow.permissions?.clawbg ?? false,

// ── Add to existing WHOAMI/docs action ──
// Include CLAWBG_DOCS in the returned documentation string

// ── Update master_api_keys permissions for existing users ──
// Run in Supabase SQL editor:
/*
UPDATE master_api_keys
SET permissions = permissions || '{"clawbg": true}'::jsonb
WHERE is_active = true;
*/
