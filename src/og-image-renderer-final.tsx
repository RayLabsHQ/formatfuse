import type { RenderFunctionInput } from "astro-opengraph-images";
import React from "react";
const { twj } = await import("tw-to-css");

export interface OGImageProps extends RenderFunctionInput {
  toolType?: string;
  sourceFormat?: string; 
  targetFormat?: string;
}

function getToolColor(toolType: string): string {
  const colors: Record<string, string> = {
    pdf: '#ef4444',      // red
    image: '#10b981',    // emerald
    developer: '#6366f1', // indigo
    text: '#f59e0b',     // amber
    default: '#8b5cf6'   // violet
  };
  return colors[toolType] || colors.default;
}

export async function toolOGImageFinal({ 
  title, 
  description,
  toolType = 'default',
  sourceFormat,
  targetFormat
}: OGImageProps): Promise<React.ReactNode> {
  const bgColor = getToolColor(toolType);
  
  // Format title for display
  const displayTitle = sourceFormat && targetFormat 
    ? `${sourceFormat.toUpperCase()} to ${targetFormat.toUpperCase()}`
    : title;
    
  return Promise.resolve(
    <div style={{
      ...twj("flex h-full w-full flex-col items-center justify-center"),
      background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}88 100%)`
    }}>
      <div style={twj("flex w-full flex-col justify-center p-16")}>
        <h1 style={twj("text-6xl font-black text-white mb-6")}>{displayTitle}</h1>
        <p style={twj("text-2xl text-white/80 mb-8")}>
          {description || 'Free, fast, and private file conversion'}
        </p>
        <div style={twj("flex items-center justify-between")}>
          <span style={twj("text-white/90 text-2xl font-bold")}>FormatFuse</span>
          <span style={twj("text-white/60 text-xl")}>formatfuse.com</span>
        </div>
      </div>
    </div>
  );
}