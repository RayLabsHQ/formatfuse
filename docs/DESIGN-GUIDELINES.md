# FormatFuse Design Guidelines

This document outlines the design principles and patterns used throughout FormatFuse to ensure consistency and optimal user experience across all tools and pages.

## Core Design Philosophy

### 1. Performance First
- **Zero animations** - No decorative animations that could impact performance
- **Instant feedback** - All user actions must feel immediate
- **Minimal re-renders** - Optimize component updates
- **Static where possible** - Leverage Astro's static generation

### 2. Mobile-First Approach
- Design for touch interfaces first
- Progressive enhancement for desktop
- Minimum tap targets of 44px
- Thumb-friendly interaction zones

### 3. Privacy & Trust
- Clear messaging about client-side processing
- No upload indicators or server communication UI
- Prominent privacy badges and messaging

## Visual Design System

### Typography Scale
```css
/* Headings - Responsive */
h1: text-3xl sm:text-4xl lg:text-5xl
h2: text-2xl sm:text-3xl
h3: text-xl sm:text-2xl
h4: text-lg sm:text-xl

/* Body Text */
body: text-base (16px)
small: text-sm (14px)
tiny: text-xs (12px)
```

### Color Usage
- **Primary**: Used for CTAs, active states, and key interactions
- **Muted**: Used for secondary text and subtle backgrounds
- **Card**: Semi-transparent overlays for depth
- **Border**: Subtle dividers, 50% opacity for softer look

### Spacing System
```css
/* Section Spacing */
Between sections: mt-12 pt-12 border-t
Large sections: mt-16 pt-16 border-t

/* Component Spacing */
Card padding: p-4 sm:p-6
Button/control gaps: gap-2 or gap-3
Feature cards: gap-6

/* Mobile Adjustments */
Reduce padding on mobile by ~25%
Tighter gaps for compact layouts
```

## Component Patterns

### 1. Hero Sections
```tsx
<div className="text-center mb-8 sm:mb-12 space-y-4">
  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
    <span>Tool</span>
    <span className="text-primary">Name</span>
  </h1>
  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
    Description text
  </p>
</div>
```

### 2. Feature Display
**Desktop Layout:**
```tsx
<div className="hidden sm:flex flex-wrap justify-center gap-6 mb-12">
  {features.map((feature) => (
    <div className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium text-sm">{feature.text}</p>
        <p className="text-xs text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  ))}
</div>
```

**Mobile Layout:**
```tsx
<div className="sm:hidden space-y-3 mb-8">
  <div className="flex justify-center gap-4">
    {/* Compact icon buttons */}
  </div>
  {activeFeature !== null && (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 mx-4">
      {/* Feature details */}
    </div>
  )}
</div>
```

### 3. Settings Cards
```tsx
<div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden">
  {/* Header with gradient */}
  <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      Settings Title
    </h2>
  </div>
  
  {/* Content */}
  <div className="p-6 space-y-6">
    {/* Settings sections */}
  </div>
</div>
```

### 4. File Upload Zones
```tsx
<div className={cn(
  "relative p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
  isDragging 
    ? "border-primary bg-primary/10 scale-[1.02]" 
    : "border-border bg-card/50 hover:border-primary"
)}>
  <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
  <p className="text-base sm:text-lg font-medium mb-2">Drop files here</p>
  <p className="text-xs sm:text-sm text-muted-foreground">or click to browse</p>
</div>
```

## Common UI Components

### FAQ Component
- **Desktop**: 2-column grid with cards
- **Mobile**: Collapsible accordion style
- Always includes help icon in header
- Consistent card styling with hover states

### Related Tools
- Flexible layout with direction prop
- Consistent hover effects
- Icon + title + description pattern
- Chevron indicator for navigation

### Format Selectors
- Visual format buttons with brand colors
- Clear source/target indication
- Swap functionality prominently displayed
- Mobile: Vertical layout with labels

### Quality Controls
- Preset buttons for common values
- Visual slider for fine control
- Clear percentage display
- Mobile-optimized grid layout

## Responsive Design Patterns

### Breakpoints
```css
/* Mobile First */
default: 0-639px
sm: 640px+  /* Tablet */
md: 768px+  /* Small desktop */
lg: 1024px+ /* Desktop */
xl: 1280px+ /* Large desktop */
```

### Common Responsive Patterns
1. **Hide/Show**: Use `hidden sm:block` or `sm:hidden`
2. **Stack to Grid**: `flex flex-col sm:flex-row`
3. **Padding Scale**: `p-4 sm:p-6 lg:p-8`
4. **Text Size**: `text-sm sm:text-base`
5. **Grid Columns**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

### Mobile Optimizations
- Collapsible sections for complex content
- Tap-to-reveal for feature details
- Simplified navigation with drawer
- Reduced visual complexity
- Larger touch targets

## Interaction States

### Hover Effects
```css
/* Subtle scale on interactive elements */
hover:scale-105 or group-hover:scale-110

/* Color transitions */
hover:text-primary
hover:border-primary/50
hover:bg-card/50

/* Always with smooth transitions */
transition-all duration-300
```

### Active/Selected States
- Primary background with white text
- Clear visual distinction
- Consistent across all components

### Loading States
- Inline spinners for buttons
- Progress bars for file processing
- Skeleton states for content loading

## Accessibility Guidelines

1. **Color Contrast**: Ensure WCAG AA compliance
2. **Focus States**: Clear keyboard navigation indicators
3. **Touch Targets**: Minimum 44px for mobile
4. **Screen Readers**: Proper ARIA labels and semantic HTML
5. **Error Messages**: Clear, actionable error text

## Performance Guidelines

1. **Images**: Use optimized formats, lazy load when possible
2. **Fonts**: Limit font weights, use system fonts for UI
3. **Components**: Minimize re-renders, use React.memo when needed
4. **Animations**: Only functional transitions, no decorative motion
5. **Bundle Size**: Code split by route, lazy load heavy components

## Implementation Checklist

When implementing a new tool or feature:

- [ ] Mobile layout designed and tested first
- [ ] Desktop enhancements added progressively
- [ ] Common components reused where applicable
- [ ] Consistent spacing and typography scale
- [ ] Hover and active states implemented
- [ ] Loading and error states handled
- [ ] Accessibility requirements met
- [ ] Performance impact assessed
- [ ] Cross-browser testing completed

## Future Considerations

### Ad Integration
- Pre-allocate space to prevent layout shift
- Design with 1-2 ad slots in mind
- Never interrupt user workflow
- Mobile: Maximum 2 ads per page
- Lazy load for performance

### Scalability
- Component patterns that work for 10 or 100 tools
- Consistent navigation structure
- Searchable and filterable tool listings
- Category-based organization