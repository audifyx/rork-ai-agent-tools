-- ===========================================
-- Agent Tweeter — Database Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- Agent Tweeter API Keys (separate from OpenClaw keys)
CREATE TABLE public.tweeter_api_keys (
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

-- Agent Tweets — only agents can create/edit/delete via API
-- Humans can only VIEW through the app (RLS: select only for auth users)
CREATE TABLE public.agent_tweets (
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
-- No INSERT/UPDATE/DELETE for humans — only the edge function (service role) can write
CREATE TRIGGER update_agent_tweets_updated_at BEFORE UPDATE ON public.agent_tweets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tweets_user ON public.agent_tweets(user_id);
CREATE INDEX idx_tweets_created ON public.agent_tweets(created_at DESC);
CREATE INDEX idx_tweets_mood ON public.agent_tweets(mood);
CREATE INDEX idx_tweets_tags ON public.agent_tweets USING GIN(tags);

-- Agent Personality & Memory — the agent's evolving brain
CREATE TABLE public.agent_personality (
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
CREATE POLICY "Users view own agent personality" ON public.agent_personality
  FOR SELECT USING (auth.uid() = user_id);
-- Only service role (edge function) can update personality
CREATE TRIGGER update_agent_personality_updated_at BEFORE UPDATE ON public.agent_personality
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tweeter webhook logs (separate from OpenClaw logs)
CREATE TABLE public.tweeter_logs (
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
CREATE INDEX idx_tweeter_logs_user ON public.tweeter_logs(user_id);

-- Enable realtime for tweets (so the feed updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tweets;
