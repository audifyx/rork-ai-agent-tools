-- ===========================================
-- ClawImageGen — Agent Image Generator
-- Run this in Supabase SQL Editor
-- ===========================================

-- Generated images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Prompt info
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  -- Image details
  image_url TEXT,                          -- remote URL from the generator
  storage_path TEXT,                       -- path in supabase storage (if saved)
  thumbnail_url TEXT,
  -- Generation settings
  model TEXT NOT NULL DEFAULT 'rork-default',
  width INT NOT NULL DEFAULT 1024,
  height INT NOT NULL DEFAULT 1024,
  style TEXT DEFAULT 'photorealistic',     -- photorealistic | anime | digital-art | oil-painting | sketch | cinematic
  quality TEXT DEFAULT 'standard',         -- standard | hd
  -- State
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | done | failed | saved
  is_saved BOOLEAN NOT NULL DEFAULT false, -- user explicitly saved to their gallery
  is_starred BOOLEAN NOT NULL DEFAULT false,
  -- Agent metadata
  agent_name TEXT,
  tags TEXT[] DEFAULT '{}',
  error_message TEXT,
  generation_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own images" ON public.generated_images
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_generated_images_updated_at BEFORE UPDATE ON public.generated_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gen_images_user ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_images_status ON public.generated_images(status);
CREATE INDEX IF NOT EXISTS idx_gen_images_saved ON public.generated_images(user_id, is_saved) WHERE is_saved = true;

-- Image generation API keys (ig_ prefix)
CREATE TABLE IF NOT EXISTS public.imagegen_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL DEFAULT 'ig_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  label TEXT NOT NULL DEFAULT 'ImageGen Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

ALTER TABLE public.imagegen_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own imagegen keys" ON public.imagegen_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Generation log for API analytics
CREATE TABLE IF NOT EXISTS public.imagegen_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.generated_images(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  prompt_preview TEXT,
  status_code INT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.imagegen_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own imagegen logs" ON public.imagegen_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_imagegen_logs_user ON public.imagegen_logs(user_id);

-- Realtime for live preview
ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_images;

-- Storage bucket for saved images
INSERT INTO storage.buckets (id, name, public) VALUES ('clawimagen', 'clawimagen', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Users upload own images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clawimagen' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public image access" ON storage.objects FOR SELECT USING (bucket_id = 'clawimagen');
CREATE POLICY "Users delete own images" ON storage.objects FOR DELETE USING (bucket_id = 'clawimagen' AND auth.uid()::text = (storage.foldername(name))[1]);
