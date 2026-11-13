import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://deca-exo-c836.vercel.app", lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
