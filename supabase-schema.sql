-- ===========================================
-- OpenClaw Mobile - Database Schema
-- Run this in Supabase SQL Editor
-- ===========================================

-- Timestamp updater function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- API Keys table (one per account)
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'oc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leads/Contacts table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  website TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own leads" ON public.leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_tags ON public.leads USING GIN(tags);

-- Files/Storage metadata table
CREATE TABLE public.stored_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'unknown',
  category TEXT NOT NULL DEFAULT 'general',
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stored_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own files" ON public.stored_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_stored_files_updated_at BEFORE UPDATE ON public.stored_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_files_user ON public.stored_files(user_id);
CREATE INDEX idx_files_category ON public.stored_files(category);

-- Agent configurations
CREATE TABLE public.agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'OpenClaw Agent',
  webhook_url TEXT,
  telegram_chat_id TEXT,
  permissions JSONB NOT NULL DEFAULT '{"read": true, "write": true, "delete": false}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent configs" ON public.agent_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON public.agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook logs
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own webhook logs" ON public.webhook_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_webhook_logs_user ON public.webhook_logs(user_id);

-- Storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('openclaw-files', 'openclaw-files', true);

CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own files" ON storage.objects FOR SELECT USING (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'openclaw-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for webhook logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;
