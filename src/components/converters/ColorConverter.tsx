import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Color from 'colorjs.io';
import {
  Check,
  Copy,
  Loader2,
  Palette,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  FAQ,
  type FAQItem,
} from '../ui/FAQ';
import {
  type RelatedTool,
  RelatedTools,
} from '../ui/RelatedTools';
import { ToolHeader } from '../ui/ToolHeader';

type ColorFormat =
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

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All conversions happen locally",
  },
  {
    icon: Zap,
    text: "Instant conversion",
    description: "Real-time color updates",
  },
  {
    icon: Sparkles,
    text: "15+ formats",
    description: "Professional color spaces",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert between image formats",
    icon: Palette,
  },
  {
    id: "qr-generator",
    name: "QR Code Generator",
    description: "Create custom QR codes",
    icon: Palette,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What color formats are supported?",
    answer:
      "We support HEX, RGB, HSL, HSV, HWB, LAB, LCH, OKLab, OKLCH, Display P3, Rec. 2020, ProPhoto RGB, Adobe RGB (1998), and XYZ color spaces with both D65 and D50 illuminants.",
  },
  {
    question: "How accurate are the color conversions?",
    answer:
      "Our conversions use the industry-standard Color.js library, ensuring high accuracy across all color spaces. Wide gamut colors are properly handled with appropriate color space transformations.",
  },
  {
    question: "Can I convert colors outside the sRGB gamut?",
    answer:
      "Yes! We support wide gamut color spaces like Display P3, Rec. 2020, and ProPhoto RGB. These can represent colors that standard sRGB monitors cannot display.",
  },
  {
    question: "What's the difference between LAB and OKLab?",
    answer:
      "LAB is the traditional perceptually uniform color space, while OKLab is a newer, improved version that better matches human color perception. OKLab provides more intuitive results for color manipulation.",
  },
];

const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  hsv: "HSV",
  hwb: "HWB",
  lab: "LAB",
  lch: "LCH",
  oklab: "OKLab",
  oklch: "OKLCH",
  p3: "Display P3",
  rec2020: "Rec. 2020",
  prophoto: "ProPhoto RGB",
  a98rgb: "Adobe RGB",
  xyz: "XYZ (D65)",
  xyzD50: "XYZ (D50)",
};

const FORMAT_ALIASES: Record<string, keyof typeof FORMAT_DISPLAY_NAMES> = {
  "xyz-d50": "xyzD50",
};

const MARQUEE_LENGTH_THRESHOLD = 28;
const MARQUEE_SEPARATOR = " | ";

const resolveFormatKey = (format?: string | null): string | undefined => {
  if (!format) {
    return undefined;
  }

  if (FORMAT_DISPLAY_NAMES[format]) {
    return format;
  }

  if (FORMAT_ALIASES[format]) {
    return FORMAT_ALIASES[format];
  }

  return format;
};

const getDisplayNameForFormat = (format?: string | null): string => {
  const key = resolveFormatKey(format);
  if (!key) {
    return "Value";
  }

  return FORMAT_DISPLAY_NAMES[key] ?? key.toUpperCase();
};

const getColorValueForFormat = (
  values: ColorValues,
  format?: string | null,
): string | undefined => {
  const key = resolveFormatKey(format);
  if (!key) {
    return undefined;
  }

  return values[key as keyof ColorValues];
};

const shouldAnimateValue = (value?: string | null): boolean => {
  if (!value) return false;

  if (value.includes("…") || value.includes("...")) {
    return true;
  }

  return value.length >= MARQUEE_LENGTH_THRESHOLD;
};

export const sanitizeColorInput = (value: string): string => {
  if (!value) {
    return value;
  }

  let cleaned = value
    // Normalize unicode minus signs and smart quotes
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

  // Strip surrounding quotes/backticks if present
  cleaned = cleaned.replace(/^[`'\"]+/, "").replace(/[`'\"]+$/, "");

  // Remove common CSS property prefixes like "color:" or "background-color:"
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex !== -1 && !cleaned.slice(0, colonIndex).includes("(")) {
    cleaned = cleaned.slice(colonIndex + 1);
  }

  cleaned = cleaned
    // Drop !important and trailing punctuation
    .replace(/!important$/i, "")
    .replace(/[;,]+$/g, "")
    .replace(/;/g, " ")
    // Collapse repeated whitespace and tidy parentheses/comma spacing
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*,\s*/g, ", ")
    .trim();

  // Remove spaces between a sign and numeric part ("- .5" -> "-.5")
  cleaned = cleaned.replace(/([-+])\s+(?=[\d.])/g, "$1");

  // Ensure decimals have a leading zero (".5" -> "0.5", "-.5" -> "-0.5")
  cleaned = cleaned.replace(
    /(^|[^\d])\.(\d+)/g,
    (_: string, prefix: string, digits: string) => `${prefix}0.${digits}`,
  );

  if (cleaned.includes("(") && !cleaned.includes(")")) {
    cleaned = `${cleaned})`;
  }

  // If there's a CSS color function within other text, extract it
  const functionMatch = cleaned.match(/[a-z][a-z0-9-]*\([^)]*\)/i);
  if (functionMatch && functionMatch[0] !== cleaned) {
    cleaned = functionMatch[0];
  } else if (!functionMatch) {
    // Otherwise attempt to extract a hex token
    const hexMatch = cleaned.match(/(^|[^a-z0-9])(#?[0-9A-Fa-f]{3,8})(?![a-z0-9])/i);
    if (hexMatch) {
      cleaned = hexMatch[2] ?? hexMatch[0].trim();
    }
  }

  return cleaned.trim();
};

export const detectColorFormat = (value: string): ColorFormat | null => {
  const trimmedValue = value.trim();

  // HEX format
  if (/^#?[0-9A-Fa-f]{3,8}$/.test(trimmedValue)) {
    return "hex";
  }

  // RGB format
  if (
    /^rgb\s*\(/.test(trimmedValue) ||
    /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/.test(trimmedValue)
  ) {
    return "rgb";
  }

  // HSL format - be more lenient with detection
  if (/^hsl\s*\(/.test(trimmedValue)) {
    return "hsl";
  }
  // Check for h,s,l pattern but avoid conflicting with RGB
  if (/^\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?$/.test(trimmedValue)) {
    // If percentages are present, it's definitely HSL
    if (trimmedValue.includes("%")) {
      return "hsl";
    }
    // If all values are <= 100, it could be HSL (saturation and lightness are percentages)
    const parts = trimmedValue.split(",").map((s) => parseInt(s.trim()));
    if (parts.length === 3 && parts[1] <= 100 && parts[2] <= 100) {
      // If first value > 255, it's likely HSL (hue can be 0-360)
      if (parts[0] > 255) {
        return "hsl";
      }
    }
  }

  // HSV format
  if (/^hsv\s*\(/.test(trimmedValue)) {
    return "hsv";
  }

  // HWB format
  if (/^hwb\s*\(/.test(trimmedValue)) {
    return "hwb";
  }

  // LAB format
  if (
    /^lab\s*\(/.test(trimmedValue) ||
    /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(
      trimmedValue,
    )
  ) {
    return "lab";
  }

  // LCH format
  if (/^lch\s*\(/.test(trimmedValue)) {
    return "lch";
  }

  // OKLab format
  if (/^oklab\s*\(/.test(trimmedValue)) {
    return "oklab";
  }

  // OKLCH format
  if (/^oklch\s*\(/.test(trimmedValue)) {
    return "oklch";
  }

  // Display P3 format
  if (/^color\s*\(\s*display-p3|^display-p3|^p3/i.test(trimmedValue)) {
    return "p3";
  }

  // Rec. 2020 format
  if (/^color\s*\(\s*rec2020|^rec2020/i.test(trimmedValue)) {
    return "rec2020";
  }

  // ProPhoto RGB format
  if (/^color\s*\(\s*prophoto|^prophoto/i.test(trimmedValue)) {
    return "prophoto";
  }

  // Adobe RGB format
  if (/^color\s*\(\s*a98-rgb|^a98-rgb/i.test(trimmedValue)) {
    return "a98rgb";
  }

  // XYZ format
  if (/^color\s*\(\s*xyz(?:-d50)?|^xyz/i.test(trimmedValue)) {
    return trimmedValue.toLowerCase().includes("d50") ? "xyz-d50" : "xyz";
  }

  return null;
};

interface ColorValues {
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  hwb: string;
  lab: string;
  lch: string;
  oklab: string;
  oklch: string;
  p3: string;
  rec2020: string;
  prophoto: string;
  a98rgb: string;
  xyz: string;
  xyzD50: string;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ColorConverterProps {
  initialColor?: string;
  hideHeader?: boolean;
  targetFormat?: ColorFormat;
  autoCopy?: boolean;
}

export function ColorConverter({
  initialColor = "#3B82F6",
  hideHeader = false,
  targetFormat,
  autoCopy = false,
}: ColorConverterProps) {
  const [inputValue, setInputValue] = useState("");
  const [colorValues, setColorValues] = useState<ColorValues | null>(null);
  const [previewColor, setPreviewColor] = useState("");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ColorFormat | null>(null);
  const [isValidColor, setIsValidColor] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [hasAutoPasted, setHasAutoPasted] = useState(false);
  const [sanitizedDisplayValue, setSanitizedDisplayValue] = useState<string | null>(null);
  const lastCopiedValue = useRef<string>("");

  // Debounce the input value for auto-conversion
  const debouncedInputValue = useDebounce(inputValue, 300);

  const parseInput = (value: string, format: ColorFormat): Color | null => {
    try {
      let color: Color;

      // Clean up input value
      value = value.trim();

      switch (format) {
        case "hex":
          // Color.js can parse hex with or without #
          color = new Color(value.startsWith("#") ? value : `#${value}`);
          break;

        case "rgb":
          // Handle both "r, g, b" and "rgb(r, g, b)" formats
          if (value.includes("rgb")) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (match) {
              color = new Color("srgb", [
                parseInt(match[1]) / 255,
                parseInt(match[2]) / 255,
                parseInt(match[3]) / 255,
              ]);
            } else {
              return null;
            }
          }
          break;

        case "hsl":
          // Handle both "h, s%, l%" and "hsl(h, s%, l%)" formats
          if (value.includes("hsl")) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
            if (match) {
              color = new Color("hsl", [
                parseInt(match[1]),
                parseInt(match[2]),
                parseInt(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "hsv":
          // HSV needs custom parsing as Color.js doesn't have built-in HSV
          const hsvMatch = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
          if (hsvMatch) {
            const h = parseInt(hsvMatch[1]);
            const s = parseInt(hsvMatch[2]) / 100;
            const v = parseInt(hsvMatch[3]) / 100;

            // Convert HSV to RGB
            const c = v * s;
            const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
            const m = v - c;

            let r = 0,
              g = 0,
              b = 0;
            if (h >= 0 && h < 60) {
              r = c;
              g = x;
              b = 0;
            } else if (h >= 60 && h < 120) {
              r = x;
              g = c;
              b = 0;
            } else if (h >= 120 && h < 180) {
              r = 0;
              g = c;
              b = x;
            } else if (h >= 180 && h < 240) {
              r = 0;
              g = x;
              b = c;
            } else if (h >= 240 && h < 300) {
              r = x;
              g = 0;
              b = c;
            } else if (h >= 300 && h < 360) {
              r = c;
              g = 0;
              b = x;
            }

            color = new Color("srgb", [r + m, g + m, b + m]);
          } else {
            return null;
          }
          break;

        case "hwb":
          if (value.includes("hwb")) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,?\s*(\d+)%?\s*,?\s*(\d+)%?/);
            if (match) {
              color = new Color("hwb", [
                parseInt(match[1]),
                parseInt(match[2]),
                parseInt(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "lab":
          if (value.includes("lab")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("lab", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "lch":
          if (value.includes("lch")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("lch", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "oklab":
          if (value.includes("oklab")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("oklab", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "oklch":
          if (value.includes("oklch")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("oklch", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "p3":
          if (value.includes("display-p3") || value.includes("p3")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("p3", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "rec2020":
          if (value.includes("rec2020")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("rec2020", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "prophoto":
          if (value.includes("prophoto-rgb") || value.includes("prophoto")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("prophoto", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "a98rgb":
          if (value.includes("a98-rgb")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color("a98rgb", [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        case "xyz":
        case "xyz-d50":
          const space = format === "xyz" ? "xyz-d65" : "xyz-d50";
          if (value.includes("xyz")) {
            color = new Color(value);
          } else {
            const match = value.match(
              /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
            );
            if (match) {
              color = new Color(space, [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3]),
              ]);
            } else {
              return null;
            }
          }
          break;

        default:
          return null;
      }

      return color;
    } catch (error) {
      return null;
    }
  };

  const formatColorValue = (color: Color, format: ColorFormat): string => {
    switch (format) {
      case "hex":
        return color.to("srgb").toString({ format: "hex" });

      case "rgb":
        const rgb = color.to("srgb");
        const [r, g, b] = rgb.coords.map((c) => Math.round(c * 255));
        return `rgb(${r}, ${g}, ${b})`;

      case "hsl":
        const hsl = color.to("hsl");
        return `hsl(${Math.round(hsl.coords[0])}, ${Math.round(hsl.coords[1])}%, ${Math.round(hsl.coords[2])}%)`;

      case "hsv":
        // Convert to HSV manually
        const srgb = color.to("srgb");
        const [rNorm, gNorm, bNorm] = srgb.coords;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        const delta = max - min;

        let h = 0;
        if (delta !== 0) {
          if (max === rNorm) {
            h = ((gNorm - bNorm) / delta) % 6;
          } else if (max === gNorm) {
            h = (bNorm - rNorm) / delta + 2;
          } else {
            h = (rNorm - gNorm) / delta + 4;
          }
          h = h * 60;
          if (h < 0) h += 360;
        }

        const s = max === 0 ? 0 : (delta / max) * 100;
        const v = max * 100;

        return `hsv(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(v)}%)`;

      case "hwb":
        const hwb = color.to("hwb");
        return `hwb(${Math.round(hwb.coords[0])} ${Math.round(hwb.coords[1])}% ${Math.round(hwb.coords[2])}%)`;

      case "lab":
        const lab = color.to("lab");
        return `lab(${lab.coords[0].toFixed(1)} ${lab.coords[1].toFixed(1)} ${lab.coords[2].toFixed(1)})`;

      case "lch":
        const lch = color.to("lch");
        return `lch(${lch.coords[0].toFixed(1)} ${lch.coords[1].toFixed(1)} ${lch.coords[2].toFixed(1)})`;

      case "oklab":
        const oklab = color.to("oklab");
        return `oklab(${oklab.coords[0].toFixed(3)} ${oklab.coords[1].toFixed(3)} ${oklab.coords[2].toFixed(3)})`;

      case "oklch":
        const oklch = color.to("oklch");
        return `oklch(${oklch.coords[0].toFixed(3)} ${oklch.coords[1].toFixed(3)} ${oklch.coords[2].toFixed(1)})`;

      case "p3":
        const p3 = color.to("p3");
        return `color(display-p3 ${p3.coords[0].toFixed(3)} ${p3.coords[1].toFixed(3)} ${p3.coords[2].toFixed(3)})`;

      case "rec2020":
        const rec2020 = color.to("rec2020");
        return `color(rec2020 ${rec2020.coords[0].toFixed(3)} ${rec2020.coords[1].toFixed(3)} ${rec2020.coords[2].toFixed(3)})`;

      case "prophoto":
        const prophoto = color.to("prophoto");
        return `color(prophoto-rgb ${prophoto.coords[0].toFixed(3)} ${prophoto.coords[1].toFixed(3)} ${prophoto.coords[2].toFixed(3)})`;

      case "a98rgb":
        const a98rgb = color.to("a98rgb");
        return `color(a98-rgb ${a98rgb.coords[0].toFixed(3)} ${a98rgb.coords[1].toFixed(3)} ${a98rgb.coords[2].toFixed(3)})`;

      case "xyz":
        const xyz = color.to("xyz-d65");
        return `color(xyz ${xyz.coords[0].toFixed(4)} ${xyz.coords[1].toFixed(4)} ${xyz.coords[2].toFixed(4)})`;

      case "xyz-d50":
        const xyzD50 = color.to("xyz-d50");
        return `color(xyz-d50 ${xyzD50.coords[0].toFixed(4)} ${xyzD50.coords[1].toFixed(4)} ${xyzD50.coords[2].toFixed(4)})`;

      default:
        return "";
    }
  };

  const handleConvert = useCallback((value: string) => {
    const trimmedValue = value.trim();
    const sanitizedValue = sanitizeColorInput(value);

    const normalizeForComparison = (input: string) =>
      input.replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").trim();
    const sanitizedChanged =
      sanitizedValue.length > 0 &&
      trimmedValue.length > 0 &&
      normalizeForComparison(sanitizedValue) !== normalizeForComparison(trimmedValue);

    setSanitizedDisplayValue(sanitizedChanged ? sanitizedValue : null);

    if (!sanitizedValue) {
      setIsValidColor(false);
      setColorValues(null);
      setSanitizedDisplayValue(null);
      return;
    }

    setIsConverting(true);

    // Auto-detect format
    const format = detectColorFormat(sanitizedValue);
    if (!format) {
      setIsValidColor(false);
      setColorValues(null);
      setDetectedFormat(null);
      setIsConverting(false);
      return;
    }

    setDetectedFormat(format);

    const color = parseInput(sanitizedValue, format);
    if (color) {
      setIsValidColor(true);
      const values: ColorValues = {
        hex: formatColorValue(color, "hex"),
        rgb: formatColorValue(color, "rgb"),
        hsl: formatColorValue(color, "hsl"),
        hsv: formatColorValue(color, "hsv"),
        hwb: formatColorValue(color, "hwb"),
        lab: formatColorValue(color, "lab"),
        lch: formatColorValue(color, "lch"),
        oklab: formatColorValue(color, "oklab"),
        oklch: formatColorValue(color, "oklch"),
        p3: formatColorValue(color, "p3"),
        rec2020: formatColorValue(color, "rec2020"),
        prophoto: formatColorValue(color, "prophoto"),
        a98rgb: formatColorValue(color, "a98rgb"),
        xyz: formatColorValue(color, "xyz"),
        xyzD50: formatColorValue(color, "xyz-d50"),
      };

      setColorValues(values);
      setPreviewColor(values.hex);
    } else {
      setIsValidColor(false);
      setColorValues(null);
      if (!sanitizedChanged) {
        setSanitizedDisplayValue(null);
      }
    }

    setIsConverting(false);
  }, []);

  // Auto-copy target format when color changes
  useEffect(() => {
    if (autoCopy && targetFormat && colorValues && inputValue) {
      const targetValue = getColorValueForFormat(colorValues, targetFormat);
      if (targetValue && targetValue !== lastCopiedValue.current) {
        lastCopiedValue.current = targetValue;
        navigator.clipboard.writeText(targetValue);
        const formatName = getDisplayNameForFormat(targetFormat);
        toast.success(`Copied ${formatName} value to clipboard!`);
        const resolvedFormat = resolveFormatKey(targetFormat);
        setCopiedFormat(resolvedFormat ?? targetFormat);
        setTimeout(() => setCopiedFormat(null), 2000);
      }
    }
  }, [colorValues, targetFormat, autoCopy, inputValue]);

  const handleCopy = (text: string, format?: string) => {
    // Don't copy again if autoCopy is enabled and this is the target format
    if (autoCopy && format === targetFormat) {
      // Just show the check mark without copying again
      if (format) {
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      }
      return;
    }
    
    navigator.clipboard.writeText(text);
    const label = format ? getDisplayNameForFormat(format) : null;
    toast.success(label ? `Copied ${label} to clipboard!` : "Copied to clipboard!");
    if (format) {
      const resolvedFormat = resolveFormatKey(format);
      setCopiedFormat(resolvedFormat ?? format);
      setTimeout(() => setCopiedFormat(null), 2000);
    }
  };

  // Auto-convert when input changes (debounced)
  useEffect(() => {
    handleConvert(debouncedInputValue);
  }, [debouncedInputValue, handleConvert]);

  // Auto-paste from clipboard on hover
  const handleInputHover = async () => {
    // Only auto-paste once per session and if input is empty
    if (hasAutoPasted || inputValue.trim() !== "") return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const trimmedText = clipboardText.trim();
        // Check if it's a valid color format
        const sanitizedClipboardText = sanitizeColorInput(trimmedText);
        const format = detectColorFormat(sanitizedClipboardText);
        if (format) {
          setInputValue(sanitizedClipboardText);
          setHasAutoPasted(true);
          handleConvert(sanitizedClipboardText);
        }
      }
    } catch (err) {
      // Clipboard access denied or not available
      console.log("Clipboard access denied");
    }
  };

  const getFormatLabel = (format: ColorFormat): string => {
    const labels: Record<ColorFormat, string> = {
      hex: "HEX",
      rgb: "RGB",
      hsl: "HSL",
      hsv: "HSV",
      hwb: "HWB",
      lab: "LAB",
      lch: "LCH",
      oklab: "OKLab",
      oklch: "OKLCH",
      p3: "P3",
      rec2020: "Rec.2020",
      prophoto: "ProPhoto",
      a98rgb: "Adobe RGB",
      xyz: "XYZ D65",
      "xyz-d50": "XYZ D50",
    };
    return labels[format] || format.toUpperCase();
  };

  const normalizedTargetFormat = resolveFormatKey(targetFormat);
  const normalizedCopiedFormat = resolveFormatKey(copiedFormat);
  const targetFormatValue =
    colorValues && targetFormat
      ? getColorValueForFormat(colorValues, targetFormat)
      : undefined;

  const renderColorValue = (
    value?: string,
    options: {
      containerClassName?: string;
      spanClassName?: string;
    } = {},
  ) => {
    if (!value) {
      return (
        <div className={cn("relative overflow-hidden", options.containerClassName)}>
          <span
            className={cn(
              "block font-mono text-sm text-muted-foreground",
              options.spanClassName,
            )}
          >
            --
          </span>
        </div>
      );
    }

    const animate = shouldAnimateValue(value);
    const displayValue = animate
      ? `${value}${MARQUEE_SEPARATOR}${value}`
      : value;

    return (
      <div className={cn("relative overflow-hidden max-w-full", options.containerClassName)}>
        <span
          className={cn(
            "block font-mono text-sm",
            animate ? "marquee-hover pr-8" : "truncate",
            options.spanClassName,
          )}
          aria-label={value}
        >
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Gradient Blobs - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <section className="flex-1 w-full max-w-5xl mx-auto px-0 py-4 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header with Features */}
        {!hideHeader && (
          <ToolHeader
            title={{ highlight: "Color", main: "Converter" }}
            subtitle="Paste any color format and instantly get all conversions"
            badge={{ text: "HEX RGB HSL Color Code Converter", icon: Zap }}
            features={features}
          />
        )}

        {/* Main Content - Streamlined Single Panel */}
        <div className="flex-1 px-4 sm:px-0">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-muted/50 bg-background/95 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {/* Single Row Input/Output Layout */}
              <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 lg:items-start">
                {/* Input Section */}
                <div className="lg:flex-1">
                  <div className="relative">
                    <Input
                      id="color-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onMouseEnter={handleInputHover}
                      placeholder={`Try: ${initialColor}, rgb(59, 130, 246), hsl(217, 91%, 60%)`}
                      className={cn(
                        "h-14 text-lg font-mono pr-32 transition-all w-full placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/50",
                        !isValidColor &&
                          inputValue &&
                          !isConverting &&
                          "border-destructive/50 focus:border-destructive",
                      )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isConverting && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {detectedFormat && isValidColor && !isConverting && (
                        <Badge variant="secondary" className="text-xs">
                          {getFormatLabel(detectedFormat)}
                        </Badge>
                      )}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg border-2 transition-all",
                          isValidColor && inputValue
                            ? "border-border"
                            : "border-muted bg-muted",
                        )}
                        style={{
                          backgroundColor: isValidColor && inputValue
                            ? previewColor
                            : undefined,
                        }}
                      />
                    </div>
                  </div>
                  {!isValidColor && inputValue && !isConverting && (
                    <p className="text-sm text-destructive mt-2">
                      Invalid color format. Try HEX, RGB, HSL, or other supported
                      formats.
                    </p>
                  )}
                  {sanitizedDisplayValue && (
                    <p className="text-xs text-muted-foreground mt-2">
                      We cleaned the input to interpret it as
                      {" "}
                      <span className="font-mono break-all">{sanitizedDisplayValue}</span>.
                    </p>
                  )}
                  {!inputValue && !hasAutoPasted && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Tip: Hover over the input to auto-paste from clipboard
                    </p>
                  )}
                </div>

                {/* Output Section - Target Format Display */}
                {colorValues && targetFormat && (
                  <div className="lg:flex-1 animate-fade-in">
                    <Card 
                      className="border-primary/50 bg-primary/5 h-14 flex items-center cursor-pointer hover:bg-primary/10 transition-colors group"
                      onClick={() => targetFormatValue && handleCopy(targetFormatValue, targetFormat)}
                    >
                      <CardContent className="p-0 px-2 w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-border shadow-sm flex-shrink-0"
                              style={{
                                backgroundColor: previewColor
                              }}
                            />
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {getDisplayNameForFormat(targetFormat)}
                            </Badge>
                            {renderColorValue(targetFormatValue, {
                              spanClassName: "font-semibold",
                            })}
                          </div>
                          <div className="pr-2">
                            {normalizedCopiedFormat && normalizedTargetFormat &&
                            normalizedCopiedFormat === normalizedTargetFormat ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <Copy className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* All Formats Grid - shown below the input/output row */}
              {colorValues ? (
                <div className="mt-8 space-y-6 animate-fade-in">
                  {/* All Formats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(FORMAT_DISPLAY_NAMES).map(([key, label]) => {
                      const colorValue = colorValues[key as keyof ColorValues];
                      return (
                        <button
                          key={key}
                          onClick={() => handleCopy(colorValue, key)}
                          className={cn(
                            "p-4 rounded-lg border text-left transition-all group hover:border-primary/50 hover:bg-muted/50",
                            copiedFormat === key && "border-primary bg-primary/5",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                {label}
                              </p>
                              {renderColorValue(colorValue, {
                                spanClassName: "pr-2",
                              })}
                            </div>
                            {copiedFormat === key ? (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                      <Palette className="w-10 h-10 text-primary/60" />
                    </div>
                    <p className="text-muted-foreground">
                      {inputValue ? "Converting..." : "Paste or type a color value"}
                    </p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      {inputValue ? "Processing color format..." : "Auto-detects HEX, RGB, HSL, and 12+ formats"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ and Related Tools */}
        <div className="mt-12 space-y-12 px-4 sm:px-0">
          <FAQ items={faqs} />
          <RelatedTools tools={relatedTools} />
        </div>
      </section>
    </div>
  );
}
