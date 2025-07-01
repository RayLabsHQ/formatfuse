import React from "react";
import { ToolCase, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface RelatedTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
}

type Direction = "vertical" | "horizontal" | "responsive";

interface RelatedToolsProps {
  tools: RelatedTool[];
  title?: string;
  className?: string;
  direction?: Direction; // 'vertical' | 'horizontal' | 'responsive' (horizontal desktop, vertical mobile)
}

export function RelatedTools({
  tools,
  title = "Related Tools",
  className = "",
  direction = "responsive",
}: RelatedToolsProps) {
  // Determine grid classes based on direction prop
  const getGridClasses = () => {
    switch (direction) {
      case "vertical":
        return "space-y-3"; // Always vertical
      case "horizontal":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"; // Always try to be horizontal
      case "responsive":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"; // Horizontal on desktop, vertical on mobile
    }
  };

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <ToolCase className="w-6 h-6 text-primary" />
        {title}
      </h2>
      <div className={getGridClasses()}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <a
              key={tool.id}
              href={`/tools/${tool.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/30 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                  {tool.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
