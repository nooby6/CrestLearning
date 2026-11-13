import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return ["", "/programmes", "/stem", "/homeschooling", "/parents", "/admissions", "/contact"].map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly", priority: p ? 0.7 : 1 }));
}
