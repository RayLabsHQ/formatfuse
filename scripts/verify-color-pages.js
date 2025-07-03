import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

// All color formats
const formats = [
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

async function verifyColorPages() {
  console.log("Verifying color conversion pages...\n");

  let totalExpected = 0;
  let totalFound = 0;
  let missingPages = [];

  // Check each conversion combination
  for (const from of formats) {
    for (const to of formats) {
      if (from !== to) {
        totalExpected++;
        const pagePath = path.join(
          distDir,
          "convert",
          "color",
          `${from}-to-${to}`,
          "index.html",
        );

        try {
          await fs.access(pagePath);
          totalFound++;
        } catch (error) {
          missingPages.push(`${from}-to-${to}`);
        }
      }
    }
  }

  console.log(`Expected pages: ${totalExpected}`);
  console.log(`Found pages: ${totalFound}`);
  console.log(`Missing pages: ${missingPages.length}`);

  if (missingPages.length > 0) {
    console.log("\nMissing conversions:");
    missingPages.forEach((page) => console.log(`  - ${page}`));
  }

  // Check that color pages are NOT linked from home page or navigation
  console.log("\nChecking that color pages are not linked from main pages...");

  const mainPages = [
    path.join(distDir, "index.html"),
    path.join(distDir, "tools.html"),
  ];

  for (const mainPage of mainPages) {
    try {
      const content = await fs.readFile(mainPage, "utf-8");
      const hasColorLinks = content.includes("/convert/color/");

      console.log(
        `${path.basename(mainPage)}: ${hasColorLinks ? "❌ Has color links!" : "✅ No color links"}`,
      );

      if (hasColorLinks) {
        // Find the actual links
        const matches = content.match(/\/convert\/color\/[^"'\s]*/g);
        if (matches) {
          console.log(
            "  Found links:",
            matches.slice(0, 5).join(", "),
            matches.length > 5 ? "..." : "",
          );
        }
      }
    } catch (error) {
      console.log(`${path.basename(mainPage)}: File not found`);
    }
  }

  // Check sitemap
  console.log("\nChecking sitemap-colors.xml generation...");
  const colorSitemapPath = path.join(distDir, "sitemap-colors.xml");

  try {
    const sitemapContent = await fs.readFile(colorSitemapPath, "utf-8");
    const urlMatches = sitemapContent.match(/<loc>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;

    console.log(`sitemap-colors.xml: ✅ Found with ${urlCount} URLs`);

    // Verify a few URLs
    const expectedUrls = [
      "https://formatfuse.com/convert/color/hex-to-rgb/",
      "https://formatfuse.com/convert/color/rgb-to-hsl/",
      "https://formatfuse.com/convert/color/lab-to-oklch/",
    ];

    for (const url of expectedUrls) {
      if (sitemapContent.includes(url)) {
        console.log(`  ✅ Contains ${url}`);
      } else {
        console.log(`  ❌ Missing ${url}`);
      }
    }
  } catch (error) {
    console.log("sitemap-colors.xml: ❌ Not found");
  }
}

verifyColorPages().catch(console.error);
