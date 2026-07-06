import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { features } from "@/lib/config";

/**
 * Server Supabase client scoped to the signed-in user. Pass the Clerk-issued
 * JWT so RLS enforces per-user access (policies read `auth.jwt()->>'sub'`).
 * Returns null until Supabase is configured.
 */
export function getSupabaseServer(accessToken?: string): SupabaseClient | null {
  if (!features.supabase) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } } : { auth: { persistSession: false } }
  );
}

/** Service-role client — bypasses RLS. Server-only; use only for trusted writes (e.g. Stripe webhooks). */
export function getSupabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!features.supabase || !key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}
