-- ===========================================
-- ClawVault — Secure API Key Storage
-- Run this in Supabase SQL Editor
-- ===========================================

-- Vault API Keys (cv_ prefix — separate from OpenClaw and Tweeter)
CREATE TABLE IF NOT EXISTS public.vault_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'cv_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'ClawVault Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.vault_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vault keys" ON public.vault_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_vault_keys_updated_at BEFORE UPDATE ON public.vault_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vault Entries — stored API keys/secrets
-- The actual secret value is ONLY readable via the edge function (service role)
-- Humans see it ONCE on creation, then it's masked forever in the app
-- Agents read it via the vault API
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "OpenAI Key", "Stripe Secret", etc.
  service TEXT NOT NULL DEFAULT 'other', -- openai, anthropic, stripe, github, discord, telegram, custom, other
  key_value TEXT NOT NULL,               -- the actual secret
  key_prefix TEXT,                       -- first 6 chars for display (set on insert)
  key_suffix TEXT,                       -- last 4 chars for display (set on insert)
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_revealed BOOLEAN NOT NULL DEFAULT false, -- was it ever read by the agent?
  read_count INT NOT NULL DEFAULT 0,     -- how many times agent has read it
  last_read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                -- optional expiry
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
-- Users can see metadata but NOT the actual key_value (handled by column select)
-- We allow SELECT but the app never selects key_value — only prefix/suffix
CREATE POLICY "Users view own vault entries" ON public.vault_entries
  FOR SELECT USING (auth.uid() = user_id);
-- Users can insert (store a new key)
CREATE POLICY "Users insert own vault entries" ON public.vault_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update (rename, deactivate, change tags)
CREATE POLICY "Users update own vault entries" ON public.vault_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Users can delete
CREATE POLICY "Users delete own vault entries" ON public.vault_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_entries_updated_at BEFORE UPDATE ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_vault_user ON public.vault_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_service ON public.vault_entries(service);
CREATE INDEX IF NOT EXISTS idx_vault_active ON public.vault_entries(user_id, is_active) WHERE is_active = true;

-- Auto-set prefix/suffix on insert
CREATE OR REPLACE FUNCTION public.set_vault_key_preview()
RETURNS TRIGGER AS $$
BEGIN
  NEW.key_prefix = LEFT(NEW.key_value, 6);
  NEW.key_suffix = RIGHT(NEW.key_value, 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER vault_entry_set_preview
  BEFORE INSERT OR UPDATE OF key_value ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_vault_key_preview();

-- Vault Access Logs — every time an agent reads a secret
CREATE TABLE IF NOT EXISTS public.vault_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_entry_id UUID NOT NULL REFERENCES public.vault_entries(id) ON DELETE CASCADE,
  entry_name TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'read',  -- read, list, rotate
  agent_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own vault logs" ON public.vault_access_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_vault_logs_user ON public.vault_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_logs_entry ON public.vault_access_logs(vault_entry_id);

-- Enable realtime for vault access (so the app shows live when agent reads a key)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_access_logs;
