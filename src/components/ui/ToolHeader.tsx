import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './badge';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  className 
}: ToolHeaderProps) {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Parse title - can be string, object with highlight, or React node
  const renderTitle = () => {
    if (typeof title === 'string') {
      return <>{title}</>;
    }
    
    if (React.isValidElement(title)) {
      return title;
    }
    
    if (typeof title === 'object' && title && 'main' in title) {
      return (
        <>
          {title.highlight && <span className="text-primary">{title.highlight}</span>}
          {title.highlight && ' '}
          {title.main}
        </>
      );
    }
    
    return null;
  };

  // Calculate max width of feature items
  useEffect(() => {
    if (!features || features.length === 0) return;

    // Reset max width to allow natural sizing
    setMaxWidth(null);

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const widths = featureRefs.current
        .filter(ref => ref !== null)
        .map(ref => ref!.getBoundingClientRect().width);
      
      if (widths.length > 0) {
        const max = Math.max(...widths);
        setMaxWidth(Math.ceil(max)); // Ceil to avoid fractional pixels
      }
    });
  }, [features]);

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8 space-y-2 sm:space-y-3 px-4 sm:px-0 pt-4 sm:pt-0">
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
          <div className="hidden sm:flex justify-center gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  ref={(el) => {featureRefs.current[index] = el;}}
                  className="flex items-center gap-3 group"
                  style={{ width: maxWidth ? `${maxWidth}px` : 'auto' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm whitespace-nowrap">{feature.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Features */}
          <div className="sm:hidden space-y-3 mb-6 px-4" style={{ animationDelay: "0.2s" }}>
            <div className="flex justify-center gap-4 mb-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                      activeFeature === index
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-primary/10 text-primary hover:scale-105"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
            {activeFeature !== null && (
              <div className="bg-muted/50 rounded-lg p-4 animate-fade-in">
                <p className="font-medium text-sm mb-1">{features[activeFeature].text}</p>
                <p className="text-xs text-muted-foreground">
                  {features[activeFeature].description}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}