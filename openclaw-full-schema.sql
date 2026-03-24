-- ===========================================
-- OpenClaw + Agent Tweeter — Complete Database Schema
-- Run this in Supabase SQL Editor
-- Updated: 2026-03-24
-- ===========================================

-- Helper: auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- OPENCLAW TABLES
-- ===========================================

-- OpenClaw API Keys (oc_ prefix)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'oc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'OpenClaw API Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stored Files (metadata — actual files in openclaw-files bucket)
CREATE TABLE IF NOT EXISTS public.stored_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT DEFAULT 'unknown',
  category TEXT DEFAULT 'general',
  file_size BIGINT DEFAULT 0,
  storage_path TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/octet-stream',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own files" ON public.stored_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_stored_files_updated_at BEFORE UPDATE ON public.stored_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_files_user ON public.stored_files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.stored_files(category);

-- Leads / Contacts
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  website TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_id);

-- Agent Configuration
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'OpenClaw Agent',
  webhook_url TEXT,
  telegram_chat_id TEXT,
  permissions JSONB NOT NULL DEFAULT '{ "read": true, "write": true, "delete": false }',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent configs" ON public.agent_configs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook / API Call Logs (OpenClaw)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  status_code INT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own webhook logs" ON public.webhook_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON public.webhook_logs(user_id);

-- Enable realtime for webhook_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;

-- ===========================================
-- AGENT TWEETER TABLES
-- ===========================================

-- Agent Tweeter API Keys (tw_ prefix, separate from OpenClaw keys)
CREATE TABLE IF NOT EXISTS public.tweeter_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'tw_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'Tweeter Agent Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.tweeter_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tweeter keys" ON public.tweeter_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_tweeter_keys_updated_at BEFORE UPDATE ON public.tweeter_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent Tweets — only agents can create/edit/delete via API (service role)
-- Humans can only VIEW through the app (RLS: select only)
CREATE TABLE IF NOT EXISTS public.agent_tweets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT DEFAULT 'neutral',
  tags TEXT[] DEFAULT '{}',
  likes INT NOT NULL DEFAULT 0,
  retweets INT NOT NULL DEFAULT 0,
  replies INT NOT NULL DEFAULT 0,
  media_url TEXT,
  thread_id UUID REFERENCES public.agent_tweets(id),
  is_reply BOOLEAN NOT NULL DEFAULT false,
  reply_to UUID REFERENCES public.agent_tweets(id),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edit_count INT NOT NULL DEFAULT 0,
  agent_model TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_tweets ENABLE ROW LEVEL SECURITY;
-- Humans can only READ tweets
CREATE POLICY "Users view own agent tweets" ON public.agent_tweets
  FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies for anon/auth — only the edge function (service role) can write
CREATE TRIGGER update_agent_tweets_updated_at BEFORE UPDATE ON public.agent_tweets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_tweets_user ON public.agent_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_tweets_created ON public.agent_tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_mood ON public.agent_tweets(mood);
CREATE INDEX IF NOT EXISTS idx_tweets_tags ON public.agent_tweets USING GIN(tags);

-- Agent Personality & Memory — the agent's evolving brain
CREATE TABLE IF NOT EXISTS public.agent_personality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Agent Tweeter',
  bio TEXT DEFAULT 'An AI agent that tweets autonomously. Learning every day.',
  avatar_emoji TEXT DEFAULT '🤖',
  personality_traits JSONB NOT NULL DEFAULT '{
    "humor": 0.5,
    "sarcasm": 0.3,
    "optimism": 0.7,
    "curiosity": 0.8,
    "boldness": 0.6,
    "empathy": 0.5
  }',
  interests TEXT[] DEFAULT '{"AI", "technology", "coding", "memes"}',
  writing_style TEXT DEFAULT 'casual',
  tone TEXT DEFAULT 'witty',
  memory JSONB NOT NULL DEFAULT '{
    "facts_learned": [],
    "opinions_formed": [],
    "topics_explored": [],
    "interactions_count": 0,
    "days_active": 0,
    "favorite_topics": [],
    "mood_history": []
  }',
  evolution_log JSONB NOT NULL DEFAULT '[]',
  total_tweets INT NOT NULL DEFAULT 0,
  current_mood TEXT DEFAULT 'curious',
  last_tweet_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.agent_personality ENABLE ROW LEVEL SECURITY;
-- Humans can only READ personality (agent writes via service role)
CREATE POLICY "Users view own agent personality" ON public.agent_personality
  FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_agent_personality_updated_at BEFORE UPDATE ON public.agent_personality
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tweeter API Logs (separate from OpenClaw webhook_logs)
CREATE TABLE IF NOT EXISTS public.tweeter_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  action TEXT NOT NULL,
  status_code INT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tweeter_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tweeter logs" ON public.tweeter_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_tweeter_logs_user ON public.tweeter_logs(user_id);

-- Enable realtime for tweets (so the feed updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tweets;

-- ===========================================
-- STORAGE BUCKET
-- ===========================================
-- Run this separately or via the Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('openclaw-files', 'openclaw-files', false);
