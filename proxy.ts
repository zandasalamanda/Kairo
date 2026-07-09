import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

// Next 16 renames middleware.ts -> proxy.ts. Run Clerk when configured;
// otherwise a pass-through so the app keeps working in demo mode.
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
const clerk = hasClerk ? clerkMiddleware() : null;

// Optional early-access gate: require a code (entered at /gate) to browse the
// app. OFF by default — set SITE_GATE=1 in the environment to turn it back on
// (e.g. for a future private beta). When off, the site is fully public.
const gateEnabled = process.env.SITE_GATE === "1";

// Sets an httpOnly cookie via /api/gate. API routes stay exempt (they're
// already auth-gated) so integrations/verification keep working.
function gateOpen(p: string): boolean {
  return (
    p === "/gate" ||
    p.startsWith("/api") ||
    p.startsWith("/__clerk") ||
    p === "/opengraph-image" ||
    p === "/icon.svg" ||
    p === "/robots.txt" ||
    p === "/sitemap.xml" ||
    p === "/manifest.webmanifest"
  );
}

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  const gated = req.cookies.get("sp_gate")?.value === "1";
  if (gateEnabled && !gated && !gateOpen(pathname)) {
    const url = req.nextUrl.clone();
    const to = pathname + req.nextUrl.search;
    url.pathname = "/gate";
    url.search = to && to !== "/" ? `?to=${encodeURIComponent(to)}` : "";
    return NextResponse.redirect(url);
  }
  if (clerk) return clerk(req, event);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
