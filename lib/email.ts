import "server-only";
import { features } from "@/lib/config";
import { SITE_URL } from "@/lib/site";

// Transactional email via Resend's REST API (no SDK dependency). Sending is a
// no-op until RESEND_API_KEY is set and a sending domain is verified.
const FROM = process.env.EMAIL_FROM || "Solaspace <notifications@solaspace.app>";

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!features.email || !opts.to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send error", e instanceof Error ? e.message : e);
    return false;
  }
}

export const unsubscribeUrl = (token: string) => `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shell(heading: string, inner: string, unsubUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8eaed;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#111318;border:1px solid #23262d;border-radius:16px;padding:28px;">
<div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#e6b877;font-weight:700;">Solaspace</div>
<h1 style="font-size:20px;line-height:1.3;margin:14px 0 10px;color:#ffffff;font-weight:600;">${heading}</h1>
${inner}
</div>
<div style="max-width:520px;margin:16px auto 0;text-align:center;color:#6b7280;font-size:12px;">
<a href="${SITE_URL}/app/map" style="color:#9aa0aa;text-decoration:none;">Open Solaspace</a> &nbsp;&middot;&nbsp;
<a href="${unsubUrl}" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
</div></body></html>`;
}

function cta(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:18px;background:#e6b877;color:#1b1206;font-weight:600;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:10px;">${label}</a>`;
}

function para(text: string): string {
  return `<p style="color:#9aa0aa;font-size:15px;line-height:1.6;margin:0;">${text}</p>`;
}

export function deadlineEmail(name: string, goalTitle: string, daysLeft: number, unsubUrl: string) {
  const when = daysLeft <= 0 ? "is due today" : daysLeft === 1 ? "is due tomorrow" : `is due in ${daysLeft} days`;
  return {
    subject: `“${goalTitle}” ${when}`,
    html: shell(
      `Your goal ${when}`,
      para(`Hi ${esc(name)}, a heads-up: <strong style="color:#e8eaed;">${esc(goalTitle)}</strong> ${when}. Open your map and take the next step while there's time.`) + cta("Open my map", `${SITE_URL}/app/map`),
      unsubUrl
    ),
  };
}

export function nudgeEmail(name: string, goalTitle: string, unsubUrl: string) {
  return {
    subject: `Still with you on “${goalTitle}”`,
    html: shell(
      "It's been a quiet week",
      para(`Hi ${esc(name)}, no focus sessions on <strong style="color:#e8eaed;">${esc(goalTitle)}</strong> in a while. One small step today keeps the momentum — even ten minutes counts.`) + cta("Pick up where I left off", `${SITE_URL}/app/map`),
      unsubUrl
    ),
  };
}

export function digestEmail(name: string, lines: string[], unsubUrl: string) {
  const items = lines.map((l) => `<li style="margin:7px 0;color:#9aa0aa;font-size:14px;line-height:1.5;">${l}</li>`).join("");
  return {
    subject: "Your week on Solaspace",
    html: shell(
      "Your week in review",
      para(`Hi ${esc(name)}, here's where things stand:`) + `<ul style="padding-left:18px;margin:10px 0 0;">${items}</ul>` + cta("Open Solaspace", `${SITE_URL}/app/review`),
      unsubUrl
    ),
  };
}

export { esc as escapeHtml };
