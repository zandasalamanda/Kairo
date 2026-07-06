import "server-only";
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { features } from "@/lib/config";

export interface ScopedClient {
  supabase: SupabaseClient;
  clerkUserId: string;
}

/**
 * A Supabase client scoped to the signed-in Clerk user. The Clerk session token
 * is attached as a Bearer credential; Supabase validates it (Clerk is a
 * configured third-party auth provider) and RLS reads `auth.jwt()->>'sub'`
 * (the Clerk user id) so every query is confined to that user's rows.
 *
 * Returns null when Supabase or Clerk isn't configured, or no one is signed in —
 * callers fall back to seeded demo data. Memoized per request.
 */
export const getScopedClient = cache(async (): Promise<ScopedClient | null> => {
  if (!features.supabase || !features.clerk) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId, getToken } = await auth();
  if (!userId) return null;
  const token = await getToken();
  if (!token) return null;

  // Supabase's third-party-auth pattern: keep the anon key as `apikey` and hand
  // Supabase the Clerk session token for Authorization. Supabase validates it
  // against Clerk's JWKS and RLS reads its `sub` (the Clerk user id).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => token }
  );
  return { supabase, clerkUserId: userId };
});
