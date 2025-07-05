import React, { memo } from 'react';

// This component prevents text re-rendering issues during theme changes
export const StableText = memo(({ 
  children, 
  className = '', 
  style = {} 
}: { 
  children: React.ReactNode; 
  className?: string; 
  style?: React.CSSProperties 
}) => {
  return (
    <span 
      className={className}
      style={{
        ...style,
        display: 'inline-block',
        willChange: 'auto',
        contain: 'layout style paint',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </span>
  );
});

StableText.displayName = 'StableText';