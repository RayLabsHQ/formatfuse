# Color Conversion SEO Pages Documentation

## Overview

Created SEO-specific color conversion pages for all color format pairs. These pages are designed to capture search traffic for specific color conversions without cluttering the main navigation.

## Implementation Details

### 1. Dynamic Route Structure

- **Location**: `/src/pages/convert/color/[from]-to-[to].astro`
- **URL Pattern**: `/convert/color/{source}-to-{target}/`
- **Example**: `/convert/color/hex-to-rgb/`

### 2. Supported Color Formats

- **hex** - Hexadecimal color values
- **rgb** - Red, Green, Blue color model
- **hsl** - Hue, Saturation, Lightness
- **hsv** - Hue, Saturation, Value
- **hwb** - Hue, Whiteness, Blackness
- **lab** - CIE LAB color space
- **lch** - Lightness, Chroma, Hue
- **oklab** - Perceptually uniform LAB
- **oklch** - Perceptually uniform LCH
- **p3** - Display P3 (wide gamut)
- **rec2020** - Rec. 2020 (ultra-wide gamut)
- **prophoto** - ProPhoto RGB
- **a98rgb** - Adobe RGB (1998)
- **xyz** - CIE XYZ (D65)
- **xyz-d50** - CIE XYZ (D50)

### 3. Total Pages Generated

- **210 pages** (15 formats × 14 conversions each, excluding same-to-same)

### 4. SEO Features

- **Custom title and description** for each conversion pair
- **Schema.org structured data** (WebApplication and FAQPage)
- **Breadcrumb navigation** for better SEO
- **Example conversions** in content
- **Format-specific FAQ items**
- **Dedicated sitemap** at `/sitemap-colors.xml`

### 5. Key Characteristics

- **Not linked from navigation** - These are SEO-only pages
- **Uses universal ColorConverter component** - Same functionality as main tool
- **Static pre-rendered** - Fast loading for SEO
- **Mobile-responsive** - Works on all devices

### 6. Sitemap Integration

- Created `/sitemap-colors.xml` with all 210 color conversion URLs
- Added to `robots.txt` for search engine discovery
- Each URL has monthly changefreq and 0.6 priority

### 7. Example Pages

- `/convert/color/hex-to-rgb/` - HEX to RGB conversion
- `/convert/color/rgb-to-hsl/` - RGB to HSL conversion
- `/convert/color/lab-to-oklch/` - LAB to OKLCH conversion
- `/convert/color/p3-to-rec2020/` - Display P3 to Rec. 2020 conversion

## Benefits

1. **SEO Coverage**: Captures long-tail searches for specific color conversions
2. **No Navigation Clutter**: Pages exist for SEO but don't clutter the UI
3. **Comprehensive**: Covers all possible conversion combinations
4. **Fast Loading**: Pre-rendered static pages
5. **Rich Content**: Each page has unique, relevant content for SEO

## Verification

Run `node scripts/verify-color-pages.js` to verify:

- All 210 pages are generated
- Pages are not linked from main navigation
- Sitemap is properly generated
