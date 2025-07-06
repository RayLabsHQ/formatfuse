import type { AstroIntegration } from "astro";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

interface LLMsTxtOptions {
  generateLLMsFullTxt?: boolean;
  ignoreFiles?: string[];
  customLLMsTxtTemplate?: string;
  title?: string;
  customTemplateVariables?: Record<string, string>;
}

export default function llmsTxt(options: LLMsTxtOptions = {}): AstroIntegration {
  const {
    generateLLMsFullTxt = true,
    ignoreFiles = [],
    customLLMsTxtTemplate,
    title = "FormatFuse",
    customTemplateVariables = {},
  } = options;

  return {
    name: "astro-llms-txt",
    hooks: {
      "astro:build:done": async ({ dir, routes }) => {
        const outputDir = fileURLToPath(dir);
        
        // Generate llms.txt
        const llmsTxtContent = await generateLLMsTxt(
          routes,
          title,
          customLLMsTxtTemplate,
          customTemplateVariables,
          ignoreFiles
        );
        
        await fs.writeFile(
          path.join(outputDir, "llms.txt"),
          llmsTxtContent,
          "utf-8"
        );
        
        // Generate llms-full.txt if enabled
        if (generateLLMsFullTxt) {
          const llmsFullTxtContent = await generateLLMsFullTxtContent(
            routes,
            title,
            ignoreFiles
          );
          
          await fs.writeFile(
            path.join(outputDir, "llms-full.txt"),
            llmsFullTxtContent,
            "utf-8"
          );
        }
        
        console.log("✅ Generated llms.txt" + (generateLLMsFullTxt ? " and llms-full.txt" : ""));
      },
    },
  };
}

async function generateLLMsTxt(
  routes: any[],
  title: string,
  customTemplate?: string,
  customVariables: Record<string, string> = {},
  ignoreFiles: string[] = []
): Promise<string> {
  const template = customTemplate || `# {title}

> Privacy-first file converter that runs entirely in your browser

## About

FormatFuse is a browser-based file conversion platform that processes all files locally using WebAssembly. No uploads, no servers - everything happens in your browser.

## Features

- 100% client-side processing using WASM
- Support for 30+ file formats
- Zero data leaves your browser
- No file size limits (except your RAM)
- Works offline after first load

## Tool Categories

### Image Converters
{imageConverters}

### PDF Tools
{pdfTools}

### Image Processing
{imageProcessing}

### Developer Tools
{developerTools}

### Document Converters
{documentConverters}

## Privacy

All file processing happens locally in your browser. We never upload, store, or have access to your files.

## Links

- Website: https://formatfuse.com`;

  // Categorize routes
  const categories = {
    imageConverters: [] as string[],
    pdfTools: [] as string[],
    imageProcessing: [] as string[],
    developerTools: [] as string[],
    documentConverters: [] as string[],
  };

  for (const route of routes) {
    // Skip if route doesn't have pathname or component
    if (!route.pathname || !route.component) continue;
    
    if (shouldIgnoreRoute(route.pathname, ignoreFiles)) continue;
    
    const url = `https://formatfuse.com${route.pathname}`;
    const description = getRouteDescription(route.pathname);
    
    if (route.pathname.includes("/convert/")) {
      if (route.pathname.includes("pdf")) {
        categories.pdfTools.push(`- [${description}](${url})`);
      } else {
        categories.imageConverters.push(`- [${description}](${url})`);
      }
    } else if (route.pathname.includes("/tools/")) {
      const toolName = route.pathname.split("/").pop() || "";
      if (["image-resizer", "background-remover", "image-compressor"].includes(toolName)) {
        categories.imageProcessing.push(`- [${description}](${url})`);
      } else if (["qr-generator", "base64-encoder", "json-formatter", "hash-generator", "url-shortener", "case-converter"].includes(toolName)) {
        categories.developerTools.push(`- [${description}](${url})`);
      } else {
        categories.documentConverters.push(`- [${description}](${url})`);
      }
    }
  }

  // Replace template variables
  let content = template
    .replace("{title}", title)
    .replace("{imageConverters}", categories.imageConverters.join("\n"))
    .replace("{pdfTools}", categories.pdfTools.join("\n"))
    .replace("{imageProcessing}", categories.imageProcessing.join("\n"))
    .replace("{developerTools}", categories.developerTools.join("\n"))
    .replace("{documentConverters}", categories.documentConverters.join("\n"));
  
  // Replace custom variables
  for (const [key, value] of Object.entries(customVariables)) {
    content = content.replace(new RegExp(`{${key}}`, "g"), value);
  }
  
  return content;
}

async function generateLLMsFullTxtContent(
  routes: any[],
  title: string,
  ignoreFiles: string[] = []
): Promise<string> {
  let content = `# ${title} - Complete Documentation

> Privacy-first file converter that runs entirely in your browser

This file contains the complete documentation for FormatFuse in a single document for LLM processing.

---

`;

  // Add structured content about all tools
  const toolCategories = {
    "Image Converters": [
      "PNG to JPG", "JPG to PNG", "WebP Converter", "HEIC to JPG", "SVG to PNG",
      "BMP Converter", "ICO Converter", "TIFF Converter", "AVIF Converter"
    ],
    "PDF Tools": [
      "JPG to PDF", "PNG to PDF", "Text to PDF", "PDF Split", "PDF Merge", "PDF Compress"
    ],
    "Image Processing": [
      "Image Resizer", "Background Remover", "Image Compressor"
    ],
    "Developer Tools": [
      "QR Code Generator", "Base64 Encoder", "JSON Formatter", 
      "URL Shortener", "Hash Generator", "Case Converter"
    ],
    "Document Tools": [
      "Markdown to HTML", "RTF Converter", "Word to PDF"
    ]
  };

  for (const [category, tools] of Object.entries(toolCategories)) {
    content += `## ${category}\n\n`;
    for (const tool of tools) {
      content += `### ${tool}\n`;
      content += getToolDocumentation(tool);
      content += "\n\n";
    }
  }

  return content;
}

function shouldIgnoreRoute(pathname: string, ignorePatterns: string[]): boolean {
  if (!pathname) return true;
  
  // Ignore home page, 404, and other system pages
  if (pathname === "/" || pathname === "/404" || pathname.startsWith("/_")) return true;
  
  // Ignore if pathname ends with .xml, .txt, etc.
  if (pathname.match(/\.(xml|txt|json)$/)) return true;
  
  for (const pattern of ignorePatterns) {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    if (regex.test(pathname)) return true;
  }
  
  return false;
}

function getRouteDescription(pathname: string): string {
  if (!pathname) return "Page";
  
  // Extract tool name from pathname
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1];
  
  if (!lastPart) return "Page";
  
  if (pathname.includes("/convert/")) {
    const convertParts = lastPart.split("-to-");
    if (convertParts.length === 2) {
      const [from, to] = convertParts;
      return `${from.toUpperCase()} to ${to.toUpperCase()}`;
    }
  } else if (pathname.includes("/tools/")) {
    return lastPart
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  
  return lastPart
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getToolDocumentation(toolName: string): string {
  const docs: Record<string, string> = {
    "PNG to JPG": `Converts PNG images to JPEG format. Supports transparency handling, quality adjustment, and batch processing.
- Input: PNG files
- Output: JPEG/JPG files
- Features: Quality control (0-100%), background color for transparency`,
    
    "JPG to PNG": `Converts JPEG images to PNG format with lossless compression.
- Input: JPEG/JPG files
- Output: PNG files
- Features: Preserves image quality, smaller file sizes for certain images`,
    
    "Image Resizer": `Resize images to specific dimensions while maintaining aspect ratio.
- Supported formats: PNG, JPG, WebP, GIF, BMP
- Resize modes: Percentage, fixed dimensions, aspect ratio lock
- Quality preservation options`,
    
    "Background Remover": `Remove backgrounds from images using AI-powered segmentation.
- Supported formats: PNG, JPG, WebP
- Output: Transparent PNG
- Works best with clear subject/background separation`,
    
    "QR Code Generator": `Generate QR codes for text, URLs, WiFi, and more.
- Customizable size and error correction
- Multiple data types supported
- Download as PNG or SVG`,
    
    "Base64 Encoder": `Encode and decode files or text to/from Base64 format.
- Supports all file types
- Text and file input
- URL-safe encoding option`,
    
    // Add more tool documentation as needed
  };
  
  return docs[toolName] || `Convert or process files using ${toolName}. All processing happens locally in your browser.`;
}