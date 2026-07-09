import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, unsubscribeUrl, deadlineEmail, nudgeEmail, digestEmail, escapeHtml } from "@/lib/email";

// Daily notification cron (wired via vercel.json). Secured with CRON_SECRET.
// Sends: deadline reminders (≤3 days out), a weekly digest, and an inactivity
// nudge — each gated by the user's prefs and de-duplicated so nothing repeats.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;

type Prof = {
  id: string; email: string | null; display_name: string | null;
  notify_deadlines: boolean; notify_nudges: boolean; notify_digest: boolean;
  unsubscribe_token: string; last_digest_at: string | null; last_nudge_at: string | null;
};
type G = { id: string; user_id: string; title: string; status: string; target_date: string | null; progress: number };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const now = Date.now();
  const sent = { deadline: 0, digest: 0, nudge: 0 };

  const { data: profileRows, error: pErr } = await admin
    .from("users_profile")
    .select("id, email, display_name, notify_deadlines, notify_nudges, notify_digest, unsubscribe_token, last_digest_at, last_nudge_at")
    .eq("notify_email", true)
    .not("email", "is", null)
    .limit(1000);
  if (pErr) {
    console.error("[cron.notifications] profiles query failed:", pErr.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
  const profiles = (profileRows ?? []) as Prof[];
  if (profiles.length === 0) return NextResponse.json({ ok: true, sent });

  const ids = profiles.map((p) => p.id);
  const { data: goalRows } = await admin
    .from("goals").select("id, user_id, title, status, target_date, progress").in("user_id", ids).is("archived_at", null);
  const { data: focusRows } = await admin
    .from("focus_sessions").select("user_id, created_at").in("user_id", ids).gte("created_at", new Date(now - 14 * DAY).toISOString());

  const goalsByUser = new Map<string, G[]>();
  for (const g of (goalRows ?? []) as G[]) {
    const l = goalsByUser.get(g.user_id) ?? [];
    l.push(g);
    goalsByUser.set(g.user_id, l);
  }
  const lastFocusByUser = new Map<string, number>();
  for (const f of (focusRows ?? []) as { user_id: string; created_at: string }[]) {
    const t = new Date(f.created_at).getTime();
    if (t > (lastFocusByUser.get(f.user_id) ?? 0)) lastFocusByUser.set(f.user_id, t);
  }

  const dayStamp = new Date(now).toISOString().slice(0, 10);
  const alreadySent = async (userId: string, kind: string, ref: string) => {
    const { data } = await admin.from("notifications_log").select("id").eq("user_id", userId).eq("kind", kind).eq("ref", ref).maybeSingle();
    return !!data;
  };
  const markSent = (userId: string, kind: string, ref: string) => admin.from("notifications_log").insert({ user_id: userId, kind, ref });

  for (const p of profiles) {
    const email = p.email as string;
    const name = p.display_name || "there";
    const unsub = unsubscribeUrl(p.unsubscribe_token);
    const active = (goalsByUser.get(p.id) ?? []).filter((g) => g.status === "active");

    // Deadline reminders (per goal, once)
    if (p.notify_deadlines) {
      for (const g of active) {
        if (!g.target_date) continue;
        const daysLeft = Math.ceil((new Date(g.target_date).getTime() - now) / DAY);
        if (daysLeft < 0 || daysLeft > 3) continue;
        const ref = `${g.id}:${new Date(g.target_date).toISOString().slice(0, 10)}`;
        if (await alreadySent(p.id, "deadline", ref)) continue;
        const { subject, html } = deadlineEmail(name, g.title, daysLeft, unsub);
        if (await sendEmail({ to: email, subject, html })) { sent.deadline++; await markSent(p.id, "deadline", ref); }
      }
    }

    // Weekly digest (~every 7 days)
    if (p.notify_digest && active.length > 0 && (!p.last_digest_at || now - new Date(p.last_digest_at).getTime() > 6.5 * DAY)) {
      const lines = active.slice(0, 6).map((g) => {
        const dl = g.target_date ? ` &mdash; due ${new Date(g.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "";
        return `<strong style="color:#e8eaed;">${escapeHtml(g.title)}</strong> &middot; ${Math.round(g.progress)}% done${dl}`;
      });
      const { subject, html } = digestEmail(name, lines, unsub);
      if (await sendEmail({ to: email, subject, html })) {
        sent.digest++;
        await admin.from("users_profile").update({ last_digest_at: new Date(now).toISOString() }).eq("id", p.id);
      }
    }

    // Inactivity nudge (quiet ≥5 days, at most every ~7 days)
    if (p.notify_nudges && active.length > 0 && (!p.last_nudge_at || now - new Date(p.last_nudge_at).getTime() > 6.5 * DAY)) {
      if (now - (lastFocusByUser.get(p.id) ?? 0) > 5 * DAY && !(await alreadySent(p.id, "nudge", dayStamp))) {
        const { subject, html } = nudgeEmail(name, active[0].title, unsub);
        if (await sendEmail({ to: email, subject, html })) {
          sent.nudge++;
          await admin.from("users_profile").update({ last_nudge_at: new Date(now).toISOString() }).eq("id", p.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
