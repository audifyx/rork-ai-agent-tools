import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vbjddniurobedayzldui.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiamRkbml1cm9iZWRheXpsZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjgxNDgsImV4cCI6MjA4ODM0NDE0OH0.O_8ZgupNp1fD7SXwEQpXyBva0PaooUBcIPeN6DDwdzo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL };
