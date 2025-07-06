import type { AstroIntegration } from "astro";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { allTools, categories } from "../data/tools.js";

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

### Archive Tools
{archiveTools}

## Privacy

All file processing happens locally in your browser. We never upload, store, or have access to your files.

## Links

- Website: https://formatfuse.com`;

  // Categorize routes based on actual tools data
  const categorizedTools = {
    imageConverters: [] as string[],
    pdfTools: [] as string[],
    imageProcessing: [] as string[],
    developerTools: [] as string[],
    documentConverters: [] as string[],
    archiveTools: [] as string[],
  };

  // Create a map of routes to tools for quick lookup
  const routeToTool = new Map<string, any>();
  for (const tool of allTools) {
    if (tool.route) {
      routeToTool.set(tool.route, tool);
    }
  }

  for (const route of routes) {
    // Skip if route doesn't have pathname or component
    if (!route.pathname || !route.component) continue;
    
    if (shouldIgnoreRoute(route.pathname, ignoreFiles)) continue;
    
    const url = `https://formatfuse.com${route.pathname}`;
    const tool = routeToTool.get(route.pathname);
    
    if (tool) {
      const link = `- [${tool.name}](${url})`;
      
      // Categorize based on tool category
      switch (tool.category) {
        case "image":
          if (tool.id.includes("-to-") || tool.id === "image-converter") {
            categorizedTools.imageConverters.push(link);
          } else {
            categorizedTools.imageProcessing.push(link);
          }
          break;
        case "pdf":
          categorizedTools.pdfTools.push(link);
          break;
        case "dev":
          categorizedTools.developerTools.push(link);
          break;
        case "document":
          categorizedTools.documentConverters.push(link);
          break;
        case "archive":
          categorizedTools.archiveTools.push(link);
          break;
      }
    }
  }

  // Replace template variables
  let content = template
    .replace("{title}", title)
    .replace("{imageConverters}", categorizedTools.imageConverters.join("\n"))
    .replace("{pdfTools}", categorizedTools.pdfTools.join("\n"))
    .replace("{imageProcessing}", categorizedTools.imageProcessing.join("\n"))
    .replace("{developerTools}", categorizedTools.developerTools.join("\n"))
    .replace("{documentConverters}", categorizedTools.documentConverters.join("\n"))
    .replace("{archiveTools}", categorizedTools.archiveTools.join("\n"));
  
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

  // Use actual categories and tools from the data file
  for (const category of categories) {
    content += `## ${category.name}\n\n`;
    
    for (const tool of category.tools) {
      // Skip unimplemented tools (extra safety check)
      if (tool.isImplemented === false) continue;
      
      content += `### ${tool.name}\n`;
      content += tool.description;
      
      // Add route information
      if (tool.route) {
        content += `\n- URL: https://formatfuse.com${tool.route}`;
      }
      
      // Add feature list based on tool type
      const features = getToolFeatures(tool);
      if (features.length > 0) {
        content += `\n\nFeatures:\n${features.map(f => `- ${f}`).join('\n')}`;
      }
      
      // Add specific documentation if available
      const extraDoc = getToolDocumentation(tool.name);
      if (extraDoc !== `Convert or process files using ${tool.name}. All processing happens locally in your browser.`) {
        content += `\n\n${extraDoc}`;
      }
      
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

function getToolFeatures(tool: any): string[] {
  const features: string[] = [];
  
  // Common features for all tools
  features.push("Privacy-first: Files never leave your device");
  features.push("Lightning fast: Instant processing");
  features.push("No file size limits (except your RAM)");
  
  // Tool-specific features based on category and name
  if (tool.category === "pdf") {
    switch (tool.id) {
      case "pdf-merge":
        features.push("Drag to reorder PDFs");
        features.push("Preview contents before merging");
        features.push("Merge unlimited PDFs");
        break;
      case "pdf-split":
        features.push("Extract specific pages");
        features.push("Split into multiple files");
        features.push("Visual page preview");
        break;
      case "pdf-compress":
        features.push("Reduce PDF file size");
        features.push("Maintain document quality");
        features.push("Multiple compression levels");
        break;
      case "jpg-to-pdf":
        features.push("Convert multiple images at once");
        features.push("Adjust page size and orientation");
        features.push("Reorder images before converting");
        break;
      case "pdf-to-jpg":
        features.push("Extract all pages as images");
        features.push("Choose image quality");
        features.push("Download as ZIP for multiple pages");
        break;
      case "pdf-rotate":
        features.push("Rotate individual pages");
        features.push("Rotate all pages at once");
        features.push("90°, 180°, 270° rotation options");
        break;
    }
  } else if (tool.category === "image") {
    if (tool.id === "image-converter") {
      features.push("Convert between 10+ image formats");
      features.push("Batch process multiple images");
      features.push("Preserve image quality");
    } else if (tool.id === "image-compressor") {
      features.push("Adjust quality level");
      features.push("Preview compressed result");
      features.push("Support for JPG, WebP, and AVIF");
    } else if (tool.id === "image-resizer") {
      features.push("Resize by percentage or dimensions");
      features.push("Maintain aspect ratio");
      features.push("Batch resize multiple images");
    } else if (tool.id.includes("-to-")) {
      features.push("High-quality format conversion");
      features.push("Batch processing support");
      features.push("Preserve metadata when possible");
    }
  } else if (tool.category === "archive") {
    if (tool.id.includes("extract")) {
      features.push("Extract all files at once");
      features.push("Preview archive contents");
      features.push("Download individual files");
    } else if (tool.id.includes("create")) {
      features.push("Add multiple files and folders");
      features.push("Choose compression level");
      features.push("Set archive password (if supported)");
    }
  } else if (tool.category === "dev") {
    switch (tool.id) {
      case "qr-generator":
        features.push("Multiple QR code types (URL, WiFi, Text, etc.)");
        features.push("Customizable size and error correction");
        features.push("Download as PNG or SVG");
        break;
      case "json-formatter":
        features.push("Beautify and minify JSON");
        features.push("Syntax highlighting");
        features.push("Error detection and validation");
        break;
      case "base64-encoder":
        features.push("Encode text and files");
        features.push("Decode Base64 strings");
        features.push("URL-safe encoding option");
        break;
      case "hash-generator":
        features.push("Multiple algorithms (MD5, SHA-1, SHA-256, SHA-512)");
        features.push("Hash text or files");
        features.push("Compare hash values");
        break;
      case "password-generator":
        features.push("Customizable length and character sets");
        features.push("Strength indicator");
        features.push("Bulk generation");
        break;
      case "uuid-generator":
        features.push("Generate v1, v3, v4, v5 UUIDs");
        features.push("Multiple output formats");
        features.push("Bulk generation");
        break;
    }
  }
  
  return features;
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