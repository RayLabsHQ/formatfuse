import { buildDoneHook } from "astro-opengraph-images/dist/hook.js";

const defaultOptions = {
  width: 1200,
  height: 630,
  verbose: false,
};

/**
 * Restrict Open Graph image generation to a subset of pages.
 * @param {{ options: import("astro-opengraph-images").PartialIntegrationOptions; render: import("astro-opengraph-images").RenderFunction; include?: (pathname: string) => boolean; }} params
 * @returns {import("astro").AstroIntegration}
 */
export default function limitedOpenGraphImages({ options, render, include }) {
  const optionsWithDefaults = { ...defaultOptions, ...options };
  const shouldInclude = include ?? (() => true);

  return {
    name: "limited-opengraph-images",
    hooks: {
      "astro:build:done": async (entry) => {
        if (optionsWithDefaults.verbose) {
          entry.logger.info(
            `Open Graph integration received ${entry.pages.length} page(s); example pathnames: ${entry.pages
              .slice(0, 5)
              .map((page) => page.pathname)
              .join(', ')}`,
          );
        }
        const filteredPages = entry.pages.filter((page) => shouldInclude(page.pathname));
        if (optionsWithDefaults.verbose) {
          entry.logger.info(
            `Open Graph image generation limited to ${filteredPages.length} page(s)`,
          );
          if (optionsWithDefaults.verbose && filteredPages.length > 0) {
            filteredPages.forEach((page) => entry.logger.info(`↳ ${page.pathname}`));
          }
        }
        if (filteredPages.length === 0) {
          return;
        }

        return buildDoneHook({
          ...entry,
          pages: filteredPages,
          options: optionsWithDefaults,
          render,
        });
      },
    },
  };
}
