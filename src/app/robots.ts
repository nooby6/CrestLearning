import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return {
    rules: { userAgent: "*", allow: ["/", "/programmes", "/homeschooling", "/parents", "/admissions", "/contact"], disallow: ["/admin", "/teacher", "/parent", "/student", "/api", "/class", "/account", "/files", "/portal"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
