import type { RenderFunctionInput } from "astro-opengraph-images";
import React from "react";

export interface OGImageProps extends RenderFunctionInput {
  toolType?: string;
  sourceFormat?: string;
  targetFormat?: string;
}

function getToolTheme(toolType: string, title?: string): {
  primary: string;
  secondary: string;
} {
  // Special theme for color converter
  if (title && (title.includes("Color Converter") || title.includes("HEX, RGB, HSL"))) {
    return { primary: "#a78bfa", secondary: "#8b5cf6" };
  }
  
  const themes: Record<string, { primary: string; secondary: string }> = {
    pdf: { primary: "#ef4444", secondary: "#dc2626" },
    image: { primary: "#10b981", secondary: "#059669" },
    developer: { primary: "#6366f1", secondary: "#4f46e5" },
    text: { primary: "#f59e0b", secondary: "#d97706" },
    archive: { primary: "#8b5cf6", secondary: "#7c3aed" },
    default: { primary: "#8b5cf6", secondary: "#7c3aed" },
  };
  return themes[toolType] || themes.default;
}

function getToolFeatures(title: string, toolType: string): string[] {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("color converter") || titleLower.includes("hex, rgb, hsl")) {
    return ["Instant Conversion", "All Color Formats", "Real-time Preview"];
  }

  if (titleLower.includes("base64")) {
    return ["Auto-detect Format", "File Support", "Data URI Generator"];
  }
  if (titleLower.includes("json") && titleLower.includes("formatter")) {
    return ["Syntax Highlight", "Error Detection", "Minify/Beautify"];
  }
  if (titleLower.includes("qr")) {
    return ["Custom Colors", "Multiple Formats", "Batch Generate"];
  }
  if (titleLower.includes("hash")) {
    return ["Multiple Algorithms", "File Hashing", "HMAC Support"];
  }
  if (titleLower.includes("password")) {
    return ["Cryptographically Secure", "Custom Rules", "Bulk Generate"];
  }
  if (titleLower.includes("uuid")) {
    return ["Multiple Versions", "Bulk Generate", "Custom Format"];
  }
  if (titleLower.includes("case")) {
    return ["Multiple Styles", "Smart Detection", "Preserve Format"];
  }
  if (titleLower.includes("word") && titleLower.includes("count")) {
    return ["Character Count", "Reading Time", "SEO Analysis"];
  }
  if (titleLower.includes("image") && titleLower.includes("compress")) {
    return ["Lossy & Lossless", "Batch Process", "Quality Control"];
  }
  if (titleLower.includes("image") && titleLower.includes("resize")) {
    return ["Exact Dimensions", "Aspect Ratio", "Batch Resize"];
  }
  if (titleLower.includes("pdf") && titleLower.includes("split")) {
    return ["Page Selection", "Multiple Files", "Preview Pages"];
  }
  if (titleLower.includes("pdf") && titleLower.includes("merge")) {
    return ["Drag & Drop", "Page Order", "Multiple PDFs"];
  }

  // Default features by type
  if (toolType === "image") {
    return ["Instant Preview", "Batch Process", "Quality Control"];
  }
  if (toolType === "pdf") {
    return ["Fast Processing", "Page Selection", "Secure"];
  }
  if (toolType === "developer") {
    return ["Syntax Support", "Copy to Clipboard", "Real-time"];
  }

  return ["Fast Processing", "Privacy First", "No Limits"];
}

export async function toolOGImage({
  title,
  description,
  toolType = "default",
  sourceFormat,
  targetFormat,
}: OGImageProps): Promise<React.ReactNode> {
  const theme = getToolTheme(toolType, title);

  // Check if this is the homepage
  const isHomepage = title === "FormatFuse - Free Online File Converters - FormatFuse";

  // For homepage, use the new design
  if (isHomepage) {
    return Promise.resolve(
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          background: "#1a1a21",
        }}
      >
        {/* Top Status Bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 48,
            left: 64,
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
          <span
            style={{
              color: "#94a3b8",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Privacy-First Conversion Active
          </span>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            position: "relative",
            zIndex: 10,
            padding: "48px 64px",
            width: "100%",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 80,
            }}
          >
            {/* Left Section */}
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
              }}
            >
              {/* Title */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: 32,
                }}
              >
                <h1
                  style={{
                    fontSize: 72,
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  FormatFuse
                </h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "rgba(20, 184, 166, 0.1)",
                    border: "1px solid rgba(20, 184, 166, 0.2)",
                  }}
                >
                  <svg
                    style={{ width: 20, height: 20 }}
                    fill="none"
                    stroke="#14b8a6"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    style={{
                      color: "#14b8a6",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    Free Online File Converters
                  </span>
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: 20,
                  lineHeight: 1.6,
                  marginBottom: 40,
                  maxWidth: 600,
                }}
              >
                Fast, secure, and completely private. No uploads, no servers, no
                payments. Everything happens right in your browser.
              </p>

              {/* Features */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <svg
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke="#8b5cf6"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    100% Private - Files never leave your device
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <svg
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke="#8b5cf6"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    Instant conversion - No waiting
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <svg
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke="#8b5cf6"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    No limits - Convert unlimited files
                  </span>
                </div>
              </div>

              {/* Supported Formats */}
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 16,
                  marginTop: 32,
                }}
              >
                Supports 90+ formats including PDF, JPG, PNG, HEIC, and more
              </p>
            </div>

            {/* Right Section - Visual */}
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {/* Upload Area Card */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 24,
                  padding: 48,
                  border: "2px dashed #334155",
                  background: "rgba(30, 41, 59, 0.5)",
                  minWidth: 400,
                  minHeight: 320,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 24,
                }}
              >
                <svg
                  style={{ width: 64, height: 64 }}
                  fill="none"
                  stroke="#94a3b8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    Drop any file here
                  </span>
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: 16,
                    }}
                  >
                    or click to browse
                  </span>
                </div>
              </div>

              {/* Floating badges */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: -20,
                  right: -20,
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "#14b8a6",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg
                  style={{ width: 20, height: 20 }}
                  fill="none"
                  stroke="white"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  style={{
                    fontWeight: 600,
                    color: "white",
                    fontSize: 16,
                  }}
                >
                  Instant conversion
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  bottom: -20,
                  left: -20,
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "#1e293b",
                  border: "1px solid #334155",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg
                  style={{ width: 20, height: 20 }}
                  fill="none"
                  stroke="#94a3b8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  style={{
                    fontWeight: 500,
                    color: "#94a3b8",
                    fontSize: 16,
                  }}
                >
                  No sign-up required
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Right Logo */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 48,
            right: 64,
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 1000 1000"
            fill="none"
          >
            <path
              d="M299 148.883C314.6 147.283 486.833 148.217 571 148.883C575.5 148.883 585.2 149.983 588 154.383C590.8 158.783 672.5 239.55 713 279.383C716 282.717 722.3 290.983 723.5 297.383C724.7 303.783 724 364.717 723.5 394.383C722.167 399.55 716.5 410.083 704.5 410.883C692.5 411.683 513.833 411.217 426 410.883L425.938 410.891C422.08 411.394 413.981 412.45 410.5 424.883V477.383H653C657.167 478.717 665.9 483.683 667.5 492.883C669.1 502.083 668.167 561.717 667.5 590.383C666 595.883 661 606.983 653 607.383C645 607.783 516.667 607.55 453.5 607.383H276V573H311V538H276V172.883C277.167 165.55 283.4 150.483 299 148.883ZM356 322C350.477 322 346 326.477 346 332C346 337.522 350.477 342 356 342H526C531.523 342 536 337.522 536 332C536 326.477 531.523 322 526 322H356ZM579 276.383C581.4 295.583 597 300.383 604.5 300.383H698.5L579 180.883V276.383ZM356 258C350.477 258 346 262.477 346 268C346 273.523 350.477 278 356 278H504C509.523 278 514 273.523 514 268C514 262.477 509.523 258 504 258H356Z"
              fill="#8b5cf6"
            />
            <rect x="416" y="538" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="573" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="573" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="538" width="35" height="35" fill="#8b5cf6" />
            <rect x="346" y="538" width="35" height="35" fill="#8b5cf6" />
            <rect x="311" y="573" width="35" height="35" fill="#8b5cf6" />
            <rect x="346" y="573" width="35" height="35" fill="#8b5cf6" />
            <rect x="311" y="538" width="35" height="35" fill="#8b5cf6" />
            <rect x="276" y="573" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="608" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="643" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="643" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="608" width="35" height="35" fill="#8b5cf6" />
            <rect x="346" y="608" width="35" height="35" fill="#8b5cf6" />
            <rect x="346" y="643" width="35" height="35" fill="#8b5cf6" />
            <rect x="311" y="608" width="35" height="35" fill="#8b5cf6" />
            <rect x="276" y="643" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="678" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="713" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="678" width="35" height="35" fill="#8b5cf6" />
            <rect x="311" y="713" width="35" height="35" fill="#8b5cf6" />
            <rect x="451" y="747" width="35" height="35" fill="#8b5cf6" />
            <rect x="486" y="678" width="35" height="35" fill="#8b5cf6" />
            <rect x="381" y="747" width="35" height="35" fill="#8b5cf6" />
            <rect x="416" y="817" width="35" height="35" fill="#8b5cf6" />
            <rect x="311" y="782" width="35" height="35" fill="#8b5cf6" />
          </svg>
          <span
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            FormatFuse
          </span>
        </div>
      </div>,
    );
  }

  // Clean and format title for display
  let displayTitle = title;

  // Remove common suffixes
  displayTitle = displayTitle.replace(/ - FormatFuse$/i, "");
  displayTitle = displayTitle.replace(/ - Free Online Tool$/i, "");
  displayTitle = displayTitle.replace(/ - Encode & Decode Base64 Online$/i, "");

  // For converters, use source to target format
  if (sourceFormat && targetFormat) {
    displayTitle = `${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()}`;
  }

  // Extract main title and subtitle
  let mainTitle = displayTitle;
  let subtitle = "";
  
  // Special handling for Color Converter
  if (title.includes("Color Converter") || title.includes("HEX, RGB, HSL")) {
    mainTitle = "Color Converter";
    subtitle = "Professional Color Tools";
  }

  // Check for specific tools and patterns
  if (displayTitle.includes("Base64")) {
    mainTitle = "Base64";
    subtitle = "Encoder/Decoder";
  } else if (displayTitle.includes("Extract") && displayTitle.includes("Files")) {
    // Handle extraction tools like "Extract ZIP Files Online - Unzip Archives in Browser"
    const match = displayTitle.match(/Extract\s+(\w+)\s+Files/i);
    if (match) {
      mainTitle = `${match[1]} Extractor`;
      subtitle = "Archive Tool";
    }
  } else if (displayTitle.includes(" - ")) {
    // Handle titles with dash separator
    const parts = displayTitle.split(" - ");
    mainTitle = parts[0].trim();
    // Don't use subtitle if it's too long
    if (parts[1] && parts[1].length < 30) {
      subtitle = parts[1].trim();
    }
  } else if (displayTitle.includes("JSON") && displayTitle.includes("Formatter")) {
    mainTitle = "JSON";
    subtitle = "Formatter";
  } else if (displayTitle.includes("QR") && displayTitle.includes("Generator")) {
    mainTitle = "QR Code";
    subtitle = "Generator";
  } else if (displayTitle.includes("UUID") && displayTitle.includes("Generator")) {
    mainTitle = "UUID";
    subtitle = "Generator";
  } else if (displayTitle.includes("Password") && displayTitle.includes("Generator")) {
    mainTitle = "Password";
    subtitle = "Generator";
  } else if (displayTitle.includes("Hash") && displayTitle.includes("Generator")) {
    mainTitle = "Hash";
    subtitle = "Generator";
  } else if (displayTitle.includes("Word") && displayTitle.includes("Counter")) {
    mainTitle = "Word Counter";
    subtitle = "Text Analysis";
  } else if (displayTitle.includes("Case") && displayTitle.includes("Converter")) {
    mainTitle = "Case";
    subtitle = "Converter";
  } else if (displayTitle.includes("Image") && displayTitle.includes("Compressor")) {
    mainTitle = "Image";
    subtitle = "Compressor";
  } else if (displayTitle.includes("Image") && displayTitle.includes("Resizer")) {
    mainTitle = "Image";
    subtitle = "Resizer";
  } else if (displayTitle.includes("Text") && displayTitle.includes("Diff")) {
    mainTitle = "Text Diff";
    subtitle = "Checker";
  } else if (displayTitle.includes("JWT") && displayTitle.includes("Decoder")) {
    mainTitle = "JWT";
    subtitle = "Decoder";
  } else if (displayTitle.includes("JSON") && displayTitle.includes("YAML")) {
    mainTitle = "JSON/YAML";
    subtitle = "Converter";
  } else if (displayTitle.includes("URL") && displayTitle.includes("Shortener")) {
    mainTitle = "URL";
    subtitle = "Shortener";
  } else if (displayTitle.includes("Markdown") && displayTitle.includes("HTML")) {
    mainTitle = "Markdown";
    subtitle = "to HTML";
  } else if (displayTitle.includes("SVG") && displayTitle.includes("PNG")) {
    mainTitle = "SVG to PNG";
    subtitle = "Converter";
  } else if (displayTitle.includes("Text") && displayTitle.includes("PDF")) {
    mainTitle = "Text to PDF";
    subtitle = "Converter";
  } else if (displayTitle.includes("RTF")) {
    mainTitle = "RTF";
    subtitle = "Converter";
  } else if (displayTitle.includes("CSV") && displayTitle.includes("JSON")) {
    mainTitle = "CSV/JSON";
    subtitle = "Converter";
  } else if (displayTitle.includes("XML") && displayTitle.includes("JSON")) {
    mainTitle = "XML/JSON";
    subtitle = "Converter";
  } else if (displayTitle.includes("Timestamp")) {
    mainTitle = "Timestamp";
    subtitle = "Converter";
  } else if (displayTitle.includes("Color") && displayTitle.includes("Picker")) {
    mainTitle = "Color";
    subtitle = "Picker";
  } else if (displayTitle.includes("Lorem") && displayTitle.includes("Ipsum")) {
    mainTitle = "Lorem Ipsum";
    subtitle = "Generator";
  } else if (displayTitle.includes("Regex") && displayTitle.includes("Tester")) {
    mainTitle = "Regex";
    subtitle = "Tester";
  } else if (displayTitle.includes("SQL") && displayTitle.includes("Formatter")) {
    mainTitle = "SQL";
    subtitle = "Formatter";
  } else if (displayTitle.includes("CSS") && displayTitle.includes("Minifier")) {
    mainTitle = "CSS";
    subtitle = "Minifier";
  } else if (displayTitle.includes("JavaScript") && displayTitle.includes("Minifier")) {
    mainTitle = "JavaScript";
    subtitle = "Minifier";
  } else if (displayTitle.includes("HTML") && displayTitle.includes("Minifier")) {
    mainTitle = "HTML";
    subtitle = "Minifier";
  } else if (displayTitle.includes("XML") && displayTitle.includes("Formatter")) {
    mainTitle = "XML";
    subtitle = "Formatter";
  } else if (displayTitle.includes("Create") && displayTitle.includes("Archive")) {
    mainTitle = "Archive";
    subtitle = "Creator";
  } else if (displayTitle.includes("Create") && displayTitle.includes("ZIP")) {
    mainTitle = "ZIP";
    subtitle = "Creator";
  } else if (displayTitle.includes("TAR") && displayTitle.includes("Create")) {
    mainTitle = "TAR";
    subtitle = "Creator";
  } else if (
    displayTitle.includes("Converter") ||
    displayTitle.includes("Generator")
  ) {
    // Generic converter/generator pattern
    const parts = displayTitle.split(/\s+(Converter|Generator)/i);
    if (parts[0].length < 20) {
      mainTitle = parts[0].trim();
      subtitle = displayTitle.substring(mainTitle.length).trim();
    }
  }
  
  // Additional subtitle assignment based on tool type if no subtitle yet
  if (!subtitle && toolType && toolType !== "default") {
    const typeSubtitles: Record<string, string> = {
      pdf: "PDF Tool",
      image: "Image Tool",
      developer: "Developer Tool",
      text: "Text Tool",
      archive: "Archive Tool"
    };
    subtitle = typeSubtitles[toolType] || "";
  }
  
  // If mainTitle is too long, don't use subtitle
  if (mainTitle.length > 25) {
    subtitle = "";
  }

  const features = getToolFeatures(title, toolType);

  // Use new modern design for all tools
  return Promise.resolve(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#1a1a21",
      }}
    >
      {/* Main Content */}
      <div
        style={{
          display: "flex",
          position: "relative",
          zIndex: 10,
          padding: "48px 64px",
          width: "100%",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 80,
          }}
        >
          {/* Left Section */}
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
            }}
          >
            {/* Title */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 32,
              }}
            >
              <h1
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.1,
                  marginBottom: subtitle ? 8 : 0,
                }}
              >
                {mainTitle}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: 28,
                    color: theme.primary,
                    fontWeight: 600,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Description */}
            <p
              style={{
                color: "#cbd5e1",
                fontSize: 20,
                lineHeight: 1.6,
                marginBottom: 40,
                maxWidth: 600,
              }}
            >
              {description ||
                "Transform your files with powerful tools. Fast, secure, and completely free - right in your browser."}
            </p>

            {/* Features */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <svg
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke={theme.primary}
                    viewBox="0 0 24 24"
                  >
                    {index === 0 && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    )}
                    {index === 1 && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    )}
                    {index === 2 && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    )}
                  </svg>
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Visual */}
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {/* Tool Visual Card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                padding: 48,
                border: "2px dashed #334155",
                background: "rgba(30, 41, 59, 0.5)",
                minWidth: 400,
                minHeight: 320,
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Tool Icon based on type */}
              <div
                style={{
                  display: "flex",
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  background: theme.primary,
                  boxShadow: `0 8px 32px ${theme.primary}40`,
                }}
              >
                <svg
                  style={{ width: 48, height: 48 }}
                  fill="none"
                  stroke="white"
                  viewBox="0 0 24 24"
                >
                  {toolType === "pdf" && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  )}
                  {toolType === "image" && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  )}
                  {toolType === "developer" && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  )}
                  {toolType === "archive" && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  )}
                  {(toolType === "text" || toolType === "default") && (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  )}
                </svg>
              </div>

              {/* Special display for Color Converter */}
              {(title.includes("Color Converter") || title.includes("HEX, RGB, HSL")) ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 24,
                    width: "100%",
                  }}
                >
                  {/* Color Palette Display */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    {["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"].map((color, i) => (
                      <div
                        key={i}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: color,
                          boxShadow: `0 4px 12px ${color}40`,
                          transform: `rotate(${i * 15 - 30}deg)`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Format Labels */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      justifyContent: "center",
                      maxWidth: 320,
                    }}
                  >
                    {["HEX", "RGB", "HSL", "HSV", "LAB", "CMYK"].map((format) => (
                      <div
                        key={format}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "rgba(139, 92, 246, 0.1)",
                          border: "1px solid rgba(139, 92, 246, 0.3)",
                          color: "#a78bfa",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {format}
                      </div>
                    ))}
                  </div>
                </div>
              ) : sourceFormat && targetFormat ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        padding: "12px 24px",
                        borderRadius: 12,
                        background: "rgba(148, 163, 184, 0.1)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <span
                        style={{
                          color: "white",
                          fontSize: 24,
                          fontWeight: 600,
                        }}
                      >
                        {sourceFormat.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <svg
                    style={{ width: 32, height: 32 }}
                    fill="none"
                    stroke={theme.primary}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        padding: "12px 24px",
                        borderRadius: 12,
                        background: theme.primary,
                      }}
                    >
                      <span
                        style={{
                          color: "white",
                          fontSize: 24,
                          fontWeight: 600,
                        }}
                      >
                        {targetFormat.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    Drop your files here
                  </span>
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: 16,
                    }}
                  >
                    Fast & secure processing
                  </span>
                </div>
              )}
            </div>

            {/* Floating badges */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: -20,
                right: -20,
                padding: "12px 20px",
                borderRadius: 12,
                background: theme.primary,
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="white"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                style={{
                  fontWeight: 600,
                  color: "white",
                  fontSize: 16,
                }}
              >
                {sourceFormat && targetFormat ? "Instant conversion" : "No limits"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right Logo */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 48,
          right: 64,
          alignItems: "center",
          gap: 12,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 1000 1000"
          fill="none"
        >
          <path
            d="M299 148.883C314.6 147.283 486.833 148.217 571 148.883C575.5 148.883 585.2 149.983 588 154.383C590.8 158.783 672.5 239.55 713 279.383C716 282.717 722.3 290.983 723.5 297.383C724.7 303.783 724 364.717 723.5 394.383C722.167 399.55 716.5 410.083 704.5 410.883C692.5 411.683 513.833 411.217 426 410.883L425.938 410.891C422.08 411.394 413.981 412.45 410.5 424.883V477.383H653C657.167 478.717 665.9 483.683 667.5 492.883C669.1 502.083 668.167 561.717 667.5 590.383C666 595.883 661 606.983 653 607.383C645 607.783 516.667 607.55 453.5 607.383H276V573H311V538H276V172.883C277.167 165.55 283.4 150.483 299 148.883ZM356 322C350.477 322 346 326.477 346 332C346 337.522 350.477 342 356 342H526C531.523 342 536 337.522 536 332C536 326.477 531.523 322 526 322H356ZM579 276.383C581.4 295.583 597 300.383 604.5 300.383H698.5L579 180.883V276.383ZM356 258C350.477 258 346 262.477 346 268C346 273.523 350.477 278 356 278H504C509.523 278 514 273.523 514 268C514 262.477 509.523 258 504 258H356Z"
            fill={theme.primary}
          />
          <rect x="416" y="538" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="573" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="573" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="538" width="35" height="35" fill={theme.primary} />
          <rect x="346" y="538" width="35" height="35" fill={theme.primary} />
          <rect x="311" y="573" width="35" height="35" fill={theme.primary} />
          <rect x="346" y="573" width="35" height="35" fill={theme.primary} />
          <rect x="311" y="538" width="35" height="35" fill={theme.primary} />
          <rect x="276" y="573" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="608" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="643" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="643" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="608" width="35" height="35" fill={theme.primary} />
          <rect x="346" y="608" width="35" height="35" fill={theme.primary} />
          <rect x="346" y="643" width="35" height="35" fill={theme.primary} />
          <rect x="311" y="608" width="35" height="35" fill={theme.primary} />
          <rect x="276" y="643" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="678" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="713" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="678" width="35" height="35" fill={theme.primary} />
          <rect x="311" y="713" width="35" height="35" fill={theme.primary} />
          <rect x="451" y="747" width="35" height="35" fill={theme.primary} />
          <rect x="486" y="678" width="35" height="35" fill={theme.primary} />
          <rect x="381" y="747" width="35" height="35" fill={theme.primary} />
          <rect x="416" y="817" width="35" height="35" fill={theme.primary} />
          <rect x="311" y="782" width="35" height="35" fill={theme.primary} />
        </svg>
        <span
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          FormatFuse
        </span>
      </div>
    </div>,
  );
}
