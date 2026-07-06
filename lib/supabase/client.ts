import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { features } from "@/lib/config";

let browser: SupabaseClient | null = null;

/** Browser Supabase client (anon key). Returns null until Supabase is configured. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!features.supabase) return null;
  if (!browser) {
    browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return browser;
}
