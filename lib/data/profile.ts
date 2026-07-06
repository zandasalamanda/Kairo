import "server-only";
import { cache } from "react";
import { getScopedClient } from "@/lib/supabase/scoped";
import { rowToProfile, type ProfileRow } from "./mappers";
import type { UserProfile } from "@/types";

/**
 * Ensure a `users_profile` row exists for the signed-in user and return it.
 * Runs on the user's first authenticated request (RLS lets a user insert only
 * their own row). Memoized per request. Returns null in demo mode.
 */
export const ensureProfile = cache(async (): Promise<UserProfile | null> => {
  const scoped = await getScopedClient();
  if (!scoped) return null;
  const { supabase, clerkUserId } = scoped;

  const existing = await supabase
    .from("users_profile")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (existing.data) return rowToProfile(existing.data as ProfileRow);

  const { currentUser } = await import("@clerk/nextjs/server");
  const u = await currentUser();
  const email = u?.primaryEmailAddress?.emailAddress ?? "";
  const displayName = u?.fullName || u?.firstName || u?.username || "You";

  const inserted = await supabase
    .from("users_profile")
    .insert({ clerk_user_id: clerkUserId, email, display_name: displayName })
    .select()
    .single();
  if (inserted.data) return rowToProfile(inserted.data as ProfileRow);

  // Lost a race with a concurrent request — the row now exists; read it back.
  const retry = await supabase
    .from("users_profile")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  return retry.data ? rowToProfile(retry.data as ProfileRow) : null;
});

/** The signed-in user's profile id (the uuid goals/inbox are keyed on). */
export const currentProfileId = cache(async (): Promise<string | null> => {
  const p = await ensureProfile();
  return p?.id ?? null;
});
