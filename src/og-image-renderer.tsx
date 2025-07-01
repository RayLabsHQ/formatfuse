import type { RenderFunctionInput } from "astro-opengraph-images";
import React from "react";

export interface OGImageProps extends RenderFunctionInput {
  toolType?: string;
  sourceFormat?: string;
  targetFormat?: string;
}

function getToolTheme(toolType: string): {
  primary: string;
  secondary: string;
} {
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
  const theme = getToolTheme(toolType);

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

  // Check for specific tools
  if (displayTitle.includes("Base64")) {
    mainTitle = "Base64";
    subtitle = "Encoder/Decoder";
  } else if (displayTitle.includes("JSON")) {
    const parts = displayTitle.split(" ");
    mainTitle = parts[0];
    subtitle = parts.slice(1).join(" ");
  } else if (
    displayTitle.includes("Converter") ||
    displayTitle.includes("Generator")
  ) {
    const parts = displayTitle.split(/\s+(Converter|Generator)/i);
    mainTitle = parts[0];
    subtitle = displayTitle.substring(mainTitle.length).trim();
  }

  const features = getToolFeatures(title, toolType);

  return Promise.resolve(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(to bottom right, #1e293b 0%, #334155 50%, #1e293b 100%)",
      }}
    >
      {/* Glow Effects */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 80,
          left: 80,
          width: 384,
          height: 384,
          borderRadius: "50%",
          background: theme.primary,
          opacity: 0.2,
          filter: "blur(96px)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 80,
          right: 80,
          width: 384,
          height: 384,
          borderRadius: "50%",
          background: theme.secondary,
          opacity: 0.2,
          filter: "blur(96px)",
        }}
      />

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
          justifyContent: "space-between",
        }}
      >
        {/* Middle Content */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          {/* Left Section */}
          <div
            style={{
              display: "flex",
              flex: 1,
              paddingRight: 48,
              flexDirection: "column",
            }}
          >
            {/* Title */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 40,
              }}
            >
              <h1
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {mainTitle}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: 28,
                    color: "#d1d5db",
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Feature Pills - Larger and Better Spaced */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: 40,
              }}
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    padding: "16px 24px",
                    borderRadius: 12,
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <svg
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke={
                      index === 0
                        ? theme.primary
                        : index === 1
                          ? theme.secondary
                          : theme.primary
                    }
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    )}
                    {index === 2 && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    )}
                  </svg>
                  <span
                    style={{
                      color: "white",
                      fontWeight: 500,
                      fontSize: 18,
                    }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* Description */}
            <p
              style={{
                color: "#d1d5db",
                fontSize: 20,
                lineHeight: 1.6,
                maxWidth: 600,
              }}
            >
              {description ||
                "Transform your files with powerful tools. Fast, secure, and completely free - right in your browser."}
            </p>
          </div>

          {/* Right Section - Visual Element */}
          <div
            style={{
              display: "flex",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                position: "relative",
              }}
            >
              {/* Generic Tool Visual */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 16,
                  padding: 32,
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  background: "rgba(30, 41, 59, 0.5)",
                  minWidth: 340,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
              >
                {/* FormatFuse Logo in Card */}
                <div
                  style={{
                    display: "flex",
                    width: 90,
                    height: 90,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 32,
                    marginLeft: "auto",
                    marginRight: "auto",
                    background: theme.primary,
                    boxShadow: `0 8px 32px ${theme.primary}40`,
                  }}
                >
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 1000 1000"
                    fill="none"
                  >
                    <path
                      d="M299 148.883C314.6 147.283 486.833 148.217 571 148.883C575.5 148.883 585.2 149.983 588 154.383C590.8 158.783 672.5 239.55 713 279.383C716 282.717 722.3 290.983 723.5 297.383C724.7 303.783 724 364.717 723.5 394.383C722.167 399.55 716.5 410.083 704.5 410.883C692.5 411.683 513.833 411.217 426 410.883L425.938 410.891C422.08 411.394 413.981 412.45 410.5 424.883V477.383H653C657.167 478.717 665.9 483.683 667.5 492.883C669.1 502.083 668.167 561.717 667.5 590.383C666 595.883 661 606.983 653 607.383C645 607.783 516.667 607.55 453.5 607.383H276V573H311V538H276V172.883C277.167 165.55 283.4 150.483 299 148.883ZM356 322C350.477 322 346 326.477 346 332C346 337.522 350.477 342 356 342H526C531.523 342 536 337.522 536 332C536 326.477 531.523 322 526 322H356ZM579 276.383C581.4 295.583 597 300.383 604.5 300.383H698.5L579 180.883V276.383ZM356 258C350.477 258 346 262.477 346 268C346 273.523 350.477 278 356 278H504C509.523 278 514 273.523 514 268C514 262.477 509.523 258 504 258H356Z"
                      fill="white"
                    />
                    <rect x="416" y="538" width="35" height="35" fill="white" />
                    <rect x="381" y="573" width="35" height="35" fill="white" />
                    <rect x="416" y="573" width="35" height="35" fill="white" />
                    <rect x="381" y="538" width="35" height="35" fill="white" />
                    <rect x="346" y="538" width="35" height="35" fill="white" />
                    <rect x="311" y="573" width="35" height="35" fill="white" />
                    <rect x="346" y="573" width="35" height="35" fill="white" />
                    <rect x="311" y="538" width="35" height="35" fill="white" />
                    <rect x="276" y="573" width="35" height="35" fill="white" />
                    <rect x="416" y="608" width="35" height="35" fill="white" />
                    <rect x="381" y="643" width="35" height="35" fill="white" />
                    <rect x="416" y="643" width="35" height="35" fill="white" />
                    <rect x="381" y="608" width="35" height="35" fill="white" />
                    <rect x="346" y="608" width="35" height="35" fill="white" />
                    <rect x="346" y="643" width="35" height="35" fill="white" />
                    <rect x="311" y="608" width="35" height="35" fill="white" />
                    <rect x="276" y="643" width="35" height="35" fill="white" />
                    <rect x="416" y="678" width="35" height="35" fill="white" />
                    <rect x="416" y="713" width="35" height="35" fill="white" />
                    <rect x="381" y="678" width="35" height="35" fill="white" />
                    <rect x="311" y="713" width="35" height="35" fill="white" />
                    <rect x="451" y="747" width="35" height="35" fill="white" />
                    <rect x="486" y="678" width="35" height="35" fill="white" />
                    <rect x="381" y="747" width="35" height="35" fill="white" />
                    <rect x="416" y="817" width="35" height="35" fill="white" />
                    <rect x="311" y="782" width="35" height="35" fill="white" />
                  </svg>
                </div>

                {/* Visual representation of tool */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      height: 16,
                      borderRadius: 9999,
                      background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`,
                      width: "100%",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      height: 16,
                      borderRadius: 9999,
                      background: "rgba(148, 163, 184, 0.3)",
                      width: "80%",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      height: 16,
                      borderRadius: 9999,
                      background: "rgba(148, 163, 184, 0.3)",
                      width: "60%",
                    }}
                  />
                </div>
              </div>

              {/* Floating Elements */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: -16,
                  right: -16,
                  padding: "12px 20px",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  background: `linear-gradient(to bottom right, ${theme.primary}, ${theme.secondary})`,
                  transform: "rotate(3deg)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "white",
                    fontSize: 16,
                  }}
                >
                  {sourceFormat && targetFormat
                    ? `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()}`
                    : "Fast & Secure"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section with URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            formatfuse.com
          </span>
        </div>
      </div>

      {/* Bottom Accent */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})`,
        }}
      />
    </div>,
  );
}
