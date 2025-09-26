import type { APIRoute } from "astro";

import {
  archiveFormats,
  archiveIntentModifiers,
  isArchiveModifierApplicable,
} from "../data/archiveFormats";

export const GET: APIRoute = ({ site }) => {
  const urls: string[] = [];

  for (const format of archiveFormats) {
    urls.push(`/extract/archive/${format.id}/`);
    for (const modifier of archiveIntentModifiers) {
      if (!isArchiveModifierApplicable(modifier, format.id)) continue;
      urls.push(`/extract/archive/${format.id}/${modifier.slug}/`);
    }
  }

  const unique = Array.from(new Set(urls)).sort();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique
  .map(
    (url) => `  <url>
    <loc>${site}${url.startsWith('/') ? url.slice(1) : url}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
