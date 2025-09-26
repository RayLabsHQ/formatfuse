import type { APIRoute } from "astro";
import {
  colorIntentModifiers,
  isModifierApplicable,
  type SupportedFormat,
} from "../data/colorModifiers";

export const GET: APIRoute = ({ site }) => {
  // All color formats
  const formats: SupportedFormat[] = [
    "hex",
    "rgb",
    "hsl",
    "hsv",
    "hwb",
    "lab",
    "lch",
    "oklab",
    "oklch",
    "p3",
    "rec2020",
    "prophoto",
    "a98rgb",
    "xyz",
    "xyz-d50",
  ];

  // Generate all conversion combinations
  const colorPages: string[] = [];

  for (const from of formats) {
    for (const to of formats) {
      if (from !== to) {
        colorPages.push(`/convert/color/${from}-to-${to}/`);
        for (const modifier of colorIntentModifiers) {
          if (isModifierApplicable(modifier, from, to)) {
            colorPages.push(`/convert/color/${from}-to-${to}/${modifier.slug}/`);
          }
        }
      }
    }
  }

  const uniquePages = Array.from(new Set(colorPages));

  // Sort alphabetically for consistency
  uniquePages.sort();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePages
  .map(
    (url) => `  <url>
    <loc>${site}${url.startsWith("/") ? url.slice(1) : url}</loc>
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
