import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

// One-click unsubscribe from the email footer. Flips the master email switch off
// for the row matching the token (service-role, so it works without a session).
export const dynamic = "force-dynamic";

function page(message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solaspace</title></head>
<body style="margin:0;background:#0a0b0d;color:#e8eaed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;">
<div style="max-width:420px;">
<div style="color:#e6b877;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;">Solaspace</div>
<p style="font-size:16px;line-height:1.6;margin:16px 0 20px;color:#c7ccd4;">${message}</p>
<a href="${SITE_URL}/app/settings" style="color:#9aa0aa;font-size:13px;">Manage notification settings</a>
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const admin = getSupabaseAdmin();
  if (!token || !admin) return page("This unsubscribe link is invalid or expired.");
  const { error } = await admin.from("users_profile").update({ notify_email: false }).eq("unsubscribe_token", token);
  if (error) {
    console.error("[unsubscribe]", error.message);
    return page("Something went wrong — you can turn emails off from Settings.");
  }
  return page("You're unsubscribed from Solaspace emails. You can re-enable them anytime in Settings.");
}
