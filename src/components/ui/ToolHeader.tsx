import React from "react";
import { Badge } from "./badge";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Feature {
  icon: LucideIcon;
  text: string;
  description: string;
}

interface ToolHeaderProps {
  title: string | { highlight?: string; main: string } | React.ReactNode;
  subtitle?: string;
  badge?: {
    text: string;
    icon?: LucideIcon;
  };
  features?: Feature[];
  className?: string;
}

export function ToolHeader({
  title,
  subtitle,
  badge,
  features,
  className,
}: ToolHeaderProps) {

  // Parse title - can be string, object with highlight, or React node
  const renderTitle = () => {
    if (typeof title === "string") {
      return <>{title}</>;
    }

    if (React.isValidElement(title)) {
      return title;
    }

    if (typeof title === "object" && title && "main" in title) {
      return (
        <>
          {title.highlight && (
            <span className="text-primary">{title.highlight}</span>
          )}
          {title.highlight && " "}
          {title.main}
        </>
      );
    }

    return null;
  };


  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* Header */}
      <div className="text-center mb-2 sm:mb-6 md:mb-8 space-y-2 sm:space-y-3 px-4 sm:px-0">
        {badge && (
          <Badge
            className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
            variant="secondary"
          >
            {badge.icon && <badge.icon className="w-3 h-3 mr-1" />}
            {badge.text}
          </Badge>
        )}

        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold animate-fade-in">
          {renderTitle()}
        </h1>

        {subtitle && (
          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Features Section */}
      {features && features.length > 0 && (
        <>
          {/* Desktop Features */}
          <div
            className="hidden sm:flex justify-center gap-6 mb-12 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 group flex-1 max-w-[200px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">
                      {feature.text}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}
