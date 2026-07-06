import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/guides`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/sign-up`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/sign-in`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
