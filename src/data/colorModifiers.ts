export type SupportedFormat =
  | "hex"
  | "rgb"
  | "hsl"
  | "hsv"
  | "hwb"
  | "lab"
  | "lch"
  | "oklab"
  | "oklch"
  | "p3"
  | "rec2020"
  | "prophoto"
  | "a98rgb"
  | "xyz"
  | "xyz-d50";

export interface ColorFormatMeta {
  key: SupportedFormat;
  name: string;
  description: string;
}

export const colorFormatMeta: ColorFormatMeta[] = [
  { key: "hex", name: "HEX", description: "Hexadecimal color values" },
  { key: "rgb", name: "RGB", description: "Red, Green, Blue color model" },
  { key: "hsl", name: "HSL", description: "Hue, Saturation, Lightness" },
  { key: "hsv", name: "HSV", description: "Hue, Saturation, Value" },
  { key: "hwb", name: "HWB", description: "Hue, Whiteness, Blackness" },
  { key: "lab", name: "LAB", description: "CIE LAB color space" },
  { key: "lch", name: "LCH", description: "Lightness, Chroma, Hue" },
  { key: "oklab", name: "OKLab", description: "Perceptually uniform LAB" },
  { key: "oklch", name: "OKLCH", description: "Perceptually uniform LCH" },
  { key: "p3", name: "Display P3", description: "Wide gamut RGB color space" },
  { key: "rec2020", name: "Rec. 2020", description: "Ultra-wide gamut color space" },
  { key: "prophoto", name: "ProPhoto RGB", description: "Professional photography color space" },
  { key: "a98rgb", name: "Adobe RGB", description: "Adobe RGB (1998) color space" },
  { key: "xyz", name: "XYZ", description: "CIE XYZ color space (D65)" },
  { key: "xyz-d50", name: "XYZ D50", description: "CIE XYZ color space (D50)" },
];

export interface ModifierApplicability {
  onlyFrom?: SupportedFormat[];
  onlyTo?: SupportedFormat[];
  excludePairs?: Array<{ from: SupportedFormat; to: SupportedFormat }>;
}

export interface ModifierContent {
  summary: string;
  valueProps: string[];
  workflowSteps: string[];
  pitfalls: string[];
  useCases: string[];
  faq: Array<{ question: string; answer: string }>;
  seoKeywords: string[];
  ctaTitle: string;
  ctaBody: string;
}

export interface ColorIntentModifier {
  slug: string;
  label: string;
  titleSuffix: string;
  heroTagline: string;
  metaDescription: string;
  applicability?: ModifierApplicability;
  content: ModifierContent;
}

export const colorIntentModifiers: ColorIntentModifier[] = [
  {
    slug: "css-developers",
    label: "CSS Developers",
    titleSuffix: "for CSS Developers",
    heroTagline: "Generate CSS-ready color tokens in every format you need",
    metaDescription:
      "Convert colors across HEX, RGB, HSL, OKLCH, P3 and more with copy-ready CSS syntax, live previews, and accessibility tips tailored for front-end workflows.",
    content: {
      summary:
        "Ship consistent design systems faster by translating design specs into production-ready CSS color tokens without copy-paste mistakes.",
      valueProps: [
        "Instant conversions with CSS-compatible syntax for every output",
        "WCAG contrast previews to validate accessible combinations",
        "Color.js-powered accuracy so gradients behave as expected",
        "Clipboard shortcuts and history for rapid iteration",
      ],
      workflowSteps: [
        "Paste the color value from Figma or your codebase in any supported format.",
        "Switch to the target format (HEX, RGB, HSL, OKLCH, etc.) and review the live preview.",
        "Copy the CSS-ready value or grab the variables block for your design token file.",
      ],
      pitfalls: [
        "Watch for rounding differences between design exports and CSS runtime.",
        "Remember that OKLCH and LAB require modern browser support—add fallbacks if needed.",
        "Wide gamut colors may clip on sRGB monitors; preview in the target color space.",
      ],
      useCases: [
        "Building theme-switching tokens with HEX + HSL pairs",
        "Ensuring gradient stops match marketing specs",
        "Auditing brand palettes for accessible combinations",
        "Migrating colors from design tools into CSS custom properties",
      ],
      faq: [
        {
          question: "Can I export CSS variables directly?",
          answer:
            "Yes. Convert a color, open the CSS tab, and copy the prebuilt variable snippet that includes HEX, RGB, and OKLCH values for modern theming workflows.",
        },
        {
          question: "How accurate are the OKLCH conversions?",
          answer:
            "We rely on the Color.js engine, matching leading design tools. Values stay within the OKLCH gamut and respect the updated OKLab definitions.",
        },
      ],
      seoKeywords: [
        "css color converter",
        "hex to oklch css",
        "design token colors",
        "front end color tooling",
      ],
      ctaTitle: "Ship production-ready color tokens",
      ctaBody:
        "Save time translating palette updates. Convert once, copy everywhere, and keep CSS, design, and docs in sync.",
    },
  },
  {
    slug: "print-ready",
    label: "Print Ready",
    titleSuffix: "for Print Production",
    heroTagline: "Match on-screen previews with print-safe color workflows",
    metaDescription:
      "Convert HEX, RGB, and wide-gamut colors into LAB, LCH, and XYZ values optimized for print production, color-managed exports, and proofing workflows.",
    applicability: {
      onlyTo: ["lab", "lch", "oklab", "oklch", "xyz", "xyz-d50"],
    },
    content: {
      summary:
        "Bridge digital designs and physical proofs by converting to color-managed spaces that printers, RIP software, and proofing tools expect.",
      valueProps: [
        "Color-managed conversions ready for ICC workflows",
        "Visualize gamut warnings before sending to the press",
        "Support for D50 and D65 viewing conditions",
        "Accurate rounding with configurable decimals",
      ],
      workflowSteps: [
        "Paste the on-screen color in HEX, RGB, or P3 from your design file.",
        "Convert to LAB, LCH, or XYZ and note the decimal precision required by your RIP.",
        "Export the converted values into your print profile or proofing sheet.",
      ],
      pitfalls: [
        "Soft-proof wide gamut colors to see how they compress into CMYK.",
        "Keep D50 vs D65 white points consistent across tools.",
        "Document rounding so production teams can reproduce results.",
      ],
      useCases: [
        "Preparing LAB specs for packaging vendors",
        "Converting web brand colors to print-safe values",
        "Collaborating with color houses on spot-color simulations",
        "Documenting proofing targets in preflight checklists",
      ],
      faq: [
        {
          question: "Do I still need an ICC profile?",
          answer:
            "Yes. Converting to LAB or XYZ gives you device-independent values, but the final CMYK conversion should reference your printer's ICC profile for accurate output.",
        },
        {
          question: "Which white point should I use?",
          answer:
            "Most print workflows rely on D50. If you're matching on-screen visuals, convert to XYZ D50 and make sure your proofing booth matches that lighting condition.",
        },
      ],
      seoKeywords: [
        "hex to lab print",
        "rgb to xyz d50",
        "brand color proofing",
        "design to print color conversion",
      ],
      ctaTitle: "Deliver color specs printers trust",
      ctaBody:
        "Skip the back-and-forth with production teams. Share precise LAB and XYZ values alongside your design briefs.",
    },
  },
  {
    slug: "accessibility",
    label: "Accessibility",
    titleSuffix: "for Accessible Design",
    heroTagline: "Design inclusive color palettes that pass WCAG every time",
    metaDescription:
      "Convert colors into accessible formats, preview contrast ratios, and document WCAG-ready palettes with HEX, RGB, HSL, and OKLCH values.",
    content: {
      summary:
        "Make inclusive color decisions by checking contrast while you convert between formats and documenting pass/fail states for your team.",
      valueProps: [
        "Instant contrast checks against light and dark surfaces",
        "WCAG AA and AAA indicators for text and UI elements",
        "OKLCH conversions for perceptual adjustments",
        "Palette history to compare multiple candidate colors",
      ],
      workflowSteps: [
        "Enter your primary brand color in any supported format.",
        "Convert to OKLCH or HSL to tweak lightness and chroma for better contrast.",
        "Copy the final HEX/RGB values and log the WCAG rating in your design spec.",
      ],
      pitfalls: [
        "Verify contrast in both light and dark mode backgrounds.",
        "Beware of perceptual differences across displays—test on multiple devices.",
        "Keep hover and focus states distinct while maintaining contrast requirements.",
      ],
      useCases: [
        "Designing accessible buttons and links",
        "Auditing legacy color palettes for compliance",
        "Creating inclusive data visualization palettes",
        "Documenting WCAG conformance in design systems",
      ],
      faq: [
        {
          question: "Does the converter show contrast ratios?",
          answer:
            "Yes. Use the contrast panel to compare your foreground and background colors, complete with WCAG pass/fail indicators.",
        },
        {
          question: "Which color space is best for tweaking accessibility?",
          answer:
            "OKLCH is ideal because changing lightness or chroma produces predictable visual adjustments. Convert to OKLCH, tweak the values, then copy back to HEX or RGB.",
        },
      ],
      seoKeywords: [
        "accessible color converter",
        "hex contrast checker",
        "oklch accessibility",
        "wcag color tools",
      ],
      ctaTitle: "Ship WCAG-compliant colors",
      ctaBody:
        "Document contrast ratios alongside every color conversion so handoffs stay compliant and easy to audit.",
    },
  },
  {
    slug: "brand-designers",
    label: "Brand Designers",
    titleSuffix: "for Brand Designers",
    heroTagline: "Protect brand consistency across every color space",
    metaDescription:
      "Translate brand palettes between HEX, RGB, P3, and wide-gamut spaces while preserving visual consistency and documentation ready for stakeholders.",
    content: {
      summary:
        "Keep brand colors consistent from concept to delivery by exporting accurate values for digital, print, motion, and accessibility contexts in one place.",
      valueProps: [
        "Wide-gamut conversions for motion and film teams",
        "Color swatch previews for stakeholder reviews",
        "Copy-ready palette tables for brand guidelines",
        "Version history to track palette iterations",
      ],
      workflowSteps: [
        "Insert the master brand color and review the preview across formats.",
        "Switch between sRGB, Display P3, Rec. 2020, and ProPhoto outputs as needed.",
        "Export the comparison table for your brand guidelines or presentation decks.",
      ],
      pitfalls: [
        "Document how colors should appear on non-color-managed devices.",
        "Flag wide-gamut colors that sRGB users won't see accurately.",
        "Keep alternative palette options for accessibility and motion graphics.",
      ],
      useCases: [
        "Building comprehensive brand color specs",
        "Preparing motion graphics color references",
        "Collaborating with developers on product theming",
        "Creating palette documentation for franchise partners",
      ],
      faq: [
        {
          question: "Can I export a brand palette table?",
          answer:
            "Use the palette tab to capture every format in one snapshot. Export as CSV or copy the markdown-ready table for docs.",
        },
        {
          question: "How do I share wide-gamut colors?",
          answer:
            "Convert to Display P3 or Rec. 2020 and include both wide-gamut and sRGB fallbacks so stakeholders understand the expected appearance.",
        },
      ],
      seoKeywords: [
        "brand color converter",
        "hex to p3 brand",
        "color palette documentation",
        "brand guideline tools",
      ],
      ctaTitle: "Document every brand color once",
      ctaBody:
        "Deliver a single source of truth for marketing, product, and production teams without maintaining separate spreadsheets.",
    },
  },
];

export function isModifierApplicable(
  modifier: ColorIntentModifier,
  from: SupportedFormat,
  to: SupportedFormat,
) {
  const { applicability } = modifier;
  if (!applicability) return true;
  if (applicability.onlyFrom && !applicability.onlyFrom.includes(from)) return false;
  if (applicability.onlyTo && !applicability.onlyTo.includes(to)) return false;
  if (applicability.excludePairs) {
    const blocked = applicability.excludePairs.some(
      (pair) => pair.from === from && pair.to === to,
    );
    if (blocked) return false;
  }
  return true;
}
