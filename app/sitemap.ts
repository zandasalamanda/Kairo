import type { MetadataRoute } from "next";

const base = "https://kairo-zeta-five.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, priority: 1 },
    { url: `${base}/sign-in`, priority: 0.5 },
    { url: `${base}/sign-up`, priority: 0.5 },
    { url: `${base}/onboarding`, priority: 0.7 },
  ];
}
