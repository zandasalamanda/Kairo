import { NextResponse } from "next/server";

// Temporary early-access gate. Correct code → set an httpOnly cookie the proxy
// checks. Configurable via SITE_ACCESS_CODE; defaults to the code the owner set.
const CODE = process.env.SITE_ACCESS_CODE || "APPDEV";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = String(b.code ?? "").trim();
  if (!code || code.toUpperCase() !== CODE.toUpperCase()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sp_gate", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
