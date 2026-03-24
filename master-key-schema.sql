-- ===========================================
-- OpenClaw Master Key — One Key, All Tools
-- Run in Supabase SQL Editor
-- ===========================================

CREATE TABLE IF NOT EXISTS public.master_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'ok_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'OpenClaw Master Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{
    "openclaw": true,
    "tweeter": true,
    "vault": true,
    "analytics": true
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.master_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own master keys" ON public.master_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_master_keys_updated_at BEFORE UPDATE ON public.master_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
