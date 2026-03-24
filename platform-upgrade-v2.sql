-- ===========================================
-- OpenClaw Platform Upgrade — v2
-- Run this in Supabase SQL Editor
-- Safe to run on existing database (uses IF NOT EXISTS)
-- ===========================================

-- ===========================================
-- FIX: Missing INSERT policy for webhook_logs
-- The OpenClaw edge function inserts via service role, but
-- if we ever want the client to insert, this is needed
-- ===========================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Insert webhook logs'
  ) THEN
    CREATE POLICY "Insert webhook logs" ON public.webhook_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ===========================================
-- 1. NOTIFICATIONS — agent-to-user push notifications
-- Agents can send notifications, users can read/dismiss them
-- ===========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',  -- info, warning, error, success, agent
  source TEXT DEFAULT 'system',       -- system, openclaw, tweeter, scheduler
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,                    -- deep link or external URL
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ===========================================
-- 2. AGENT ACTIVITY FEED — unified timeline of everything agents do
-- Every action across all tools gets logged here for a single feed view
-- ===========================================
CREATE TABLE IF NOT EXISTS public.agent_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,             -- openclaw, tweeter, scheduler, etc.
  action TEXT NOT NULL,           -- create_tweet, upload_file, create_lead, etc.
  description TEXT NOT NULL,      -- human-readable: "Agent posted a tweet about AI"
  icon TEXT DEFAULT '🤖',         -- emoji for the activity
  metadata JSONB DEFAULT '{}',   -- any extra data (file_id, tweet_id, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON public.agent_activity
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.agent_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.agent_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_tool ON public.agent_activity(tool);

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity;

-- ===========================================
-- 3. SCHEDULED TASKS — for ClawScheduler (future tool)
-- Agents can create scheduled/recurring tasks
-- ===========================================
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tool TEXT NOT NULL DEFAULT 'openclaw',   -- which tool owns this task
  action TEXT NOT NULL,                     -- action to execute
  params JSONB DEFAULT '{}',               -- params to pass to the action
  schedule_type TEXT NOT NULL DEFAULT 'once', -- once, daily, weekly, hourly, cron
  cron_expression TEXT,                     -- for cron type: "0 9 * * *"
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INT NOT NULL DEFAULT 0,
  max_runs INT,                             -- null = unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.scheduled_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON public.scheduled_tasks(next_run_at) WHERE is_active = true;

-- ===========================================
-- 4. ANALYTICS EVENTS — track agent actions for dashboards
-- Used by ClawAnalytics (future tool) but collected now
-- ===========================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- tweet_created, file_uploaded, lead_added, etc.
  tool TEXT NOT NULL,                -- openclaw, tweeter, etc.
  value NUMERIC DEFAULT 1,           -- for counting/summing
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analytics" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_tool ON public.analytics_events(tool);

-- ===========================================
-- 5. USER PROFILES — display name, avatar, preferences
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB NOT NULL DEFAULT '{
    "notifications_enabled": true,
    "dark_mode": true,
    "auto_refresh": true,
    "default_tool": "openclaw"
  }',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only create trigger if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ===========================================
-- 6. AGENT CONVERSATION MEMORY — for smarter agents
-- Store conversation threads between user and agent
-- ===========================================
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL DEFAULT 'openclaw',
  role TEXT NOT NULL,             -- user, assistant, system
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id UUID,                -- group messages into sessions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversations" ON public.agent_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.agent_conversations(created_at DESC);

-- ===========================================
-- 7. ADD TAGS COLUMN TO STORED_FILES (if missing)
-- Allows file tagging and search
-- ===========================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stored_files' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.stored_files ADD COLUMN tags TEXT[] DEFAULT '{}';
    CREATE INDEX idx_files_tags ON public.stored_files USING GIN(tags);
  END IF;
END $$;

-- ===========================================
-- 8. ADD STARRED/PINNED SUPPORT TO FILES AND LEADS
-- ===========================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stored_files' AND column_name = 'is_starred'
  ) THEN
    ALTER TABLE public.stored_files ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'is_starred'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_tweets' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.agent_tweets ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ===========================================
-- 9. STORAGE BUCKET — ensure it exists
-- ===========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('openclaw-files', 'openclaw-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (safe to re-run with IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users upload own files') THEN
    CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users view own files') THEN
    CREATE POLICY "Users view own files" ON storage.objects FOR SELECT
      USING (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users delete own files') THEN
    CREATE POLICY "Users delete own files" ON storage.objects FOR DELETE
      USING (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
