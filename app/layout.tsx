import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { features } from "@/lib/config";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const title = "Aether — Map the way. Build the day.";
const description =
  "Tell Aether what you want done. It turns your goals, ideas, and available time into a clear plan for today.";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kairo-zeta-five.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Aether",
  appleWebApp: { capable: true, title: "Aether", statusBarStyle: "black-translucent" },
  openGraph: { title, description, siteName: "Aether", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* ClerkProvider only when Clerk is configured; demo mode runs bare. */}
        {features.clerk ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
