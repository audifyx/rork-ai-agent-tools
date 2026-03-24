-- ===========================================
-- ClawAnalytics — Full Analytics Platform
-- Run this in Supabase SQL Editor
-- ===========================================

-- Analytics API Keys (ca_ prefix)
CREATE TABLE IF NOT EXISTS public.analytics_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'ca_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'Analytics Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.analytics_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own analytics keys" ON public.analytics_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_analytics_keys_updated_at BEFORE UPDATE ON public.analytics_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent Performance Snapshots — daily/hourly rollups
CREATE TABLE IF NOT EXISTS public.agent_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL DEFAULT 'daily', -- hourly, daily, weekly
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  tool TEXT NOT NULL, -- openclaw, tweeter, clawvault, all
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Example metrics: { "files_uploaded": 5, "leads_created": 3, "tweets_posted": 12, "api_calls": 45, "secrets_read": 2 }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own snapshots" ON public.agent_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON public.agent_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON public.agent_snapshots(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_tool ON public.agent_snapshots(tool);

-- Agent Health Checks — uptime, latency, error rates
CREATE TABLE IF NOT EXISTS public.agent_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, down, unknown
  latency_ms INT,
  error_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own health" ON public.agent_health
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_health_user ON public.agent_health(user_id);
CREATE INDEX IF NOT EXISTS idx_health_tool ON public.agent_health(tool);

-- Usage Quotas & Limits tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly
  period_key TEXT NOT NULL, -- e.g. "2026-03" for monthly
  tool TEXT NOT NULL,
  metric TEXT NOT NULL, -- api_calls, files_stored, tweets_posted, secrets_stored, leads_created
  current_value NUMERIC NOT NULL DEFAULT 0,
  limit_value NUMERIC, -- null = unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_key, tool, metric)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_usage_user ON public.usage_tracking(user_id);

-- Error Log — detailed error tracking across all tools
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  action TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  request_body JSONB,
  severity TEXT NOT NULL DEFAULT 'error', -- warning, error, critical
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own errors" ON public.error_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_errors_user ON public.error_log(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_tool ON public.error_log(tool);
CREATE INDEX IF NOT EXISTS idx_errors_severity ON public.error_log(severity);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON public.error_log(user_id, resolved) WHERE resolved = false;

-- Custom Metrics — user-defined KPIs the agent can track
CREATE TABLE IF NOT EXISTS public.custom_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'count', -- count, bytes, ms, percent, currency
  tool TEXT NOT NULL DEFAULT 'custom',
  value NUMERIC NOT NULL DEFAULT 0,
  previous_value NUMERIC,
  target_value NUMERIC,
  trend TEXT DEFAULT 'stable', -- up, down, stable
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own metrics" ON public.custom_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_custom_metrics_updated_at BEFORE UPDATE ON public.custom_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_custom_metrics_user ON public.custom_metrics(user_id);

-- Analytics Logs
CREATE TABLE IF NOT EXISTS public.analytics_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status_code INT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analytics logs" ON public.analytics_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_user ON public.analytics_logs(user_id);

-- Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_health;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.error_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
