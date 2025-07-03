import React from 'react';
import { Badge } from './badge';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolHeaderProps {
  title: string | { highlight?: string; main: string } | React.ReactNode;
  subtitle?: string;
  badge?: {
    text: string;
    icon?: LucideIcon;
  };
  className?: string;
}

export function ToolHeader({ title, subtitle, badge, className }: ToolHeaderProps) {
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

  return (
    <div className={cn(
      "text-center mb-4 sm:mb-6 md:mb-8 space-y-2 sm:space-y-3 px-4 sm:px-0 pt-4 sm:pt-0",
      className
    )}>
      {badge && (
        <Badge
          className="mb-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
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
  );
}