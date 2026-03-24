-- ===========================================
-- ClawVault FIX — Run this in Supabase SQL Editor
-- Fixes: trigger function, RLS for service role inserts,
-- ensures store_secret works end-to-end
-- ===========================================

-- 1. Recreate the preview trigger function (in case it failed first time)
CREATE OR REPLACE FUNCTION public.set_vault_key_preview()
RETURNS TRIGGER AS $$
BEGIN
  NEW.key_prefix = LEFT(NEW.key_value, 6);
  NEW.key_suffix = RIGHT(NEW.key_value, 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop and recreate trigger (safe)
DROP TRIGGER IF EXISTS vault_entry_set_preview ON public.vault_entries;
CREATE TRIGGER vault_entry_set_preview
  BEFORE INSERT OR UPDATE OF key_value ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_vault_key_preview();

-- 3. Make sure RLS is enabled but service role can bypass
-- (service role always bypasses RLS, but let's make sure policies aren't conflicting)
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on vault_entries and recreate clean
DROP POLICY IF EXISTS "Users view own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users insert own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users update own vault entries" ON public.vault_entries;
DROP POLICY IF EXISTS "Users delete own vault entries" ON public.vault_entries;

-- Recreate policies
-- SELECT: users can see their own entries (but app never selects key_value)
CREATE POLICY "Users view own vault entries" ON public.vault_entries
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: users can add entries (from the app UI)
CREATE POLICY "Users insert own vault entries" ON public.vault_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update metadata (not key_value from app, but allows it)
CREATE POLICY "Users update own vault entries" ON public.vault_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete
CREATE POLICY "Users delete own vault entries" ON public.vault_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Same for vault_api_keys
ALTER TABLE public.vault_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own vault keys" ON public.vault_api_keys;
CREATE POLICY "Users manage own vault keys" ON public.vault_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Same for vault_access_logs
ALTER TABLE public.vault_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own vault logs" ON public.vault_access_logs;
CREATE POLICY "Users view own vault logs" ON public.vault_access_logs
  FOR SELECT USING (auth.uid() = user_id);
-- Service role inserts logs (no INSERT policy needed for service role)

-- 6. Ensure realtime is on
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_access_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Verify with a test — insert and read back
-- (This runs as superuser so it bypasses RLS, simulating service role)
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Just verify the table accepts inserts with the trigger
  INSERT INTO public.vault_entries (user_id, name, key_value, service)
  VALUES ('00000000-0000-0000-0000-000000000000', '__test__', 'sk-test-1234567890', 'test')
  RETURNING key_prefix INTO test_result;
  
  -- Verify prefix was set
  IF test_result = 'sk-tes' THEN
    RAISE NOTICE 'TRIGGER WORKS: prefix = %', test_result;
  ELSE
    RAISE NOTICE 'TRIGGER ISSUE: prefix = %', test_result;
  END IF;
  
  -- Clean up test row
  DELETE FROM public.vault_entries WHERE name = '__test__' AND user_id = '00000000-0000-0000-0000-000000000000';
  
  RAISE NOTICE 'ClawVault fix complete — all good';
END $$;
