-- ============================================
-- ClawPages — Deployment Links + Live Preview
-- ============================================

-- API keys for ClawPages (cp_ prefix)
CREATE TABLE IF NOT EXISTS pages_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL UNIQUE,
  label TEXT DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_api_keys_owner" ON pages_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Deployment links — every site your agent ships
CREATE TABLE IF NOT EXISTS pages_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT DEFAULT 'unknown',          -- vercel, netlify, cloudflare, github-pages, custom
  status TEXT DEFAULT 'live',               -- live, down, archived
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  agent_name TEXT,                          -- which agent deployed it
  deploy_source TEXT,                       -- e.g. "claude", "lovable", "agentcode"
  last_checked_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_deployments_owner" ON pages_deployments
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_pages_deployments_user ON pages_deployments(user_id);
CREATE INDEX idx_pages_deployments_status ON pages_deployments(user_id, status);

-- Live preview sessions — agent pushes HTML here, app renders it
CREATE TABLE IF NOT EXISTS pages_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT DEFAULT 'Live Preview',
  html_content TEXT NOT NULL DEFAULT '<!DOCTYPE html><html><body><h1>Waiting for agent...</h1></body></html>',
  css_content TEXT,
  js_content TEXT,
  version INTEGER DEFAULT 1,
  agent_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_push_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages_live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_live_sessions_owner" ON pages_live_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Version history for live sessions
CREATE TABLE IF NOT EXISTS pages_live_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES pages_live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  version INTEGER NOT NULL,
  agent_name TEXT,
  pushed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages_live_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_live_history_owner" ON pages_live_history
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_pages_live_history_session ON pages_live_history(session_id, version DESC);

-- Logs for ClawPages API usage
CREATE TABLE IF NOT EXISTS pages_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pages_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_logs_owner" ON pages_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_pages_logs_user ON pages_logs(user_id, created_at DESC);

-- Add pages permission to existing master keys
UPDATE master_api_keys
SET permissions = permissions || '{"pages": true}'::jsonb
WHERE permissions IS NOT NULL
AND NOT (permissions ? 'pages');
