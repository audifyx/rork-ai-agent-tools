-- ============================================
-- ClawSwarm — Sub-Agent System
-- ============================================

-- Sub-agent definitions
CREATE TABLE IF NOT EXISTS swarm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',           -- assistant, researcher, coder, writer, analyst, custom
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant.',
  model TEXT NOT NULL DEFAULT 'stepfun/step-1-flash-v3.5',
  status TEXT NOT NULL DEFAULT 'active',            -- active, paused, archived
  permissions JSONB NOT NULL DEFAULT '{"openclaw": true, "tweeter": false, "vault": false, "pages": true, "analytics": true}'::jsonb,
  memory JSONB NOT NULL DEFAULT '[]'::jsonb,        -- agent memory array [{type, content, created_at}]
  personality JSONB DEFAULT '{}'::jsonb,             -- optional personality traits
  total_messages INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swarm_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swarm_agents_owner" ON swarm_agents
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_swarm_agents_user ON swarm_agents(user_id);
CREATE INDEX idx_swarm_agents_status ON swarm_agents(user_id, status);

-- Conversation threads between master agent and sub-agents
CREATE TABLE IF NOT EXISTS swarm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES swarm_agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                               -- user, assistant, system
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swarm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swarm_messages_owner" ON swarm_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_swarm_messages_agent ON swarm_messages(agent_id, created_at DESC);
CREATE INDEX idx_swarm_messages_user ON swarm_messages(user_id, created_at DESC);

-- Agent-to-agent communication channel
CREATE TABLE IF NOT EXISTS swarm_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES swarm_agents(id) ON DELETE CASCADE,
  to_agent_id UUID NOT NULL REFERENCES swarm_agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swarm_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swarm_channels_owner" ON swarm_channels
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_swarm_channels_to ON swarm_channels(to_agent_id, is_read, created_at DESC);

-- Swarm activity logs
CREATE TABLE IF NOT EXISTS swarm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES swarm_agents(id) ON DELETE SET NULL,
  agent_name TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swarm_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swarm_logs_owner" ON swarm_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_swarm_logs_user ON swarm_logs(user_id, created_at DESC);

-- Add swarm permission to master keys default
ALTER TABLE master_api_keys ALTER COLUMN permissions
  SET DEFAULT '{"vault": true, "tweeter": true, "openclaw": true, "analytics": true, "pages": true, "swarm": true}'::jsonb;

-- Update existing master keys to include swarm
UPDATE master_api_keys
SET permissions = permissions || '{"swarm": true}'::jsonb
WHERE permissions IS NOT NULL
AND NOT (permissions ? 'swarm');
