import {
  colorFormatMeta,
  colorIntentModifiers,
  isModifierApplicable,
  type ColorFormatMeta,
  type ModifierContent,
  type SupportedFormat,
} from "@/data/colorModifiers";

export interface ExampleConversion {
  input: string;
  output: string;
}

const exampleMap: Record<SupportedFormat, Partial<Record<SupportedFormat, ExampleConversion>>> = {
  hex: {
    rgb: { input: "#3B82F6", output: "rgb(59, 130, 246)" },
    hsl: { input: "#3B82F6", output: "hsl(217, 91%, 60%)" },
    lab: { input: "#3B82F6", output: "lab(54.3 48.6 -36.5)" },
    oklch: { input: "#3B82F6", output: "oklch(0.623 0.138 303.5)" },
  },
  rgb: {
    hex: { input: "rgb(59, 130, 246)", output: "#3B82F6" },
    hsl: { input: "rgb(59, 130, 246)", output: "hsl(217, 91%, 60%)" },
    hsv: { input: "rgb(59, 130, 246)", output: "hsv(217, 76%, 96%)" },
    lab: { input: "rgb(59, 130, 246)", output: "lab(54.3 48.6 -36.5)" },
  },
  hsl: {
    hex: { input: "hsl(217, 91%, 60%)", output: "#3B82F6" },
    rgb: { input: "hsl(217, 91%, 60%)", output: "rgb(59, 130, 246)" },
    oklab: { input: "hsl(217, 91%, 60%)", output: "oklab(0.623 0.076 -0.115)" },
    p3: { input: "hsl(217, 91%, 60%)", output: "color(display-p3 0.329 0.510 0.965)" },
  },
};

const defaultColors: Record<SupportedFormat, string> = {
  hex: "#3B82F6",
  rgb: "rgb(59, 130, 246)",
  hsl: "hsl(217, 91%, 60%)",
  hsv: "hsv(217, 76%, 96%)",
  hwb: "hwb(217 23% 4%)",
  lab: "lab(64.9 -12.9 -46.2)",
  lch: "lch(64.9 47.9 254.4)",
  oklab: "oklab(0.700 -0.066 -0.128)",
  oklch: "oklch(0.700 0.144 242.8)",
  p3: "color(display-p3 0.357 0.6 0.835)",
  rec2020: "color(rec2020 0.424 0.602 0.819)",
  prophoto: "color(prophoto-rgb 0.486 0.589 0.754)",
  a98rgb: "color(a98-rgb 0.411 0.649 0.840)",
  xyz: "color(xyz 0.3135 0.3486 0.8341)",
  "xyz-d50": "color(xyz-d50 0.2926 0.3393 0.6360)",
};

export const getExampleConversion = (
  from: SupportedFormat,
  to: SupportedFormat,
): ExampleConversion => {
  const match = exampleMap[from]?.[to];
  if (match) return match;
  return {
    input: `Enter ${from.toUpperCase()} color`,
    output: `Get ${to.toUpperCase()} result`,
  };
};

export const getDefaultColor = (format: SupportedFormat): string => {
  return defaultColors[format] ?? defaultColors.hex;
};

export const buildDefaultContent = (
  from: ColorFormatMeta,
  to: ColorFormatMeta,
): ModifierContent => {
  const baseFaq: ModifierContent["faq"] = [
    {
      question: `Can I convert more than just ${from.name} to ${to.name}?`,
      answer:
        "Yes. The Color Converter supports every format in the left-hand selector, so you can switch to any other color space without reloading the page.",
    },
    {
      question: "How precise are the conversions?",
      answer:
        "We rely on the open-source Color.js library, which implements modern color science and perceptual models. Values match leading design tools and browser implementations.",
    },
  ];

  if ((from.key === "rgb" || from.key === "hex") && (to.key === "lab" || to.key === "oklab" || to.key === "oklch")) {
    baseFaq.push({
      question: "Why use perceptually uniform color spaces?",
      answer:
        "Formats like LAB, OKLab, and OKLCH keep perceived color differences consistent. They are essential for gradient design, accessibility tweaks, and smooth palette adjustments.",
    });
  }

  if (to.key === "p3" || to.key === "rec2020" || to.key === "prophoto") {
    baseFaq.push({
      question: `Can every display show ${to.name} colors?`,
      answer:
        `${to.name} covers a wider gamut than sRGB. Modern Apple devices and pro monitors handle it well, but keep sRGB fallbacks for legacy hardware.`,
    });
  }

  return {
    summary: `Convert ${from.name} (${from.description}) values into ${to.name} (${to.description}) without leaving the browser. Color.js powers every conversion so you can trust the numbers in production.`,
    valueProps: [
      `Accurate ${from.name} → ${to.name} math validated against Color.js`,
      "Support for 15+ color formats in the same workspace",
      "Live preview swatches for instant visual comparison",
      "Copy-ready outputs with keyboard shortcuts and history",
    ],
    workflowSteps: [
      `Paste or type your ${from.name} color (e.g., ${from.key === "hex" ? "#3B82F6" : from.key === "rgb" ? "rgb(59, 130, 246)" : from.key === "lab" ? "lab(64.9 -12.9 -46.2)" : `${from.name} value`}).`,
      `Select ${to.name} as the output format to see the conversion instantly.`,
      "Copy the converted value or export the full palette table for documentation.",
    ],
    pitfalls: [
      `Mind rounding differences when moving between ${from.name} and ${to.name}.`,
      "Wide-gamut colors may clip on older displays—review previews before handing off.",
      "Document your conversions so teammates use the same source of truth.",
    ],
    useCases: [
      `Designers matching ${from.name} specs to developer-ready ${to.name} values`,
      "Front-end teams translating design tokens across formats",
      "Print and production teams validating color data before export",
      "Educators explaining how modern color models relate to legacy spaces",
    ],
    faq: baseFaq,
    seoKeywords: [
      `${from.key} to ${to.key} converter`,
      `${from.name.toLowerCase()} to ${to.name.toLowerCase()}`,
      "color converter online",
      "color space converter",
    ],
    ctaTitle: `Document ${from.name} → ${to.name} conversions`,
    ctaBody: "Keep engineering, design, and production teams aligned with accurate color data that never leaves the browser.",
  };
};

export {
  colorFormatMeta,
  colorIntentModifiers,
  isModifierApplicable,
};
