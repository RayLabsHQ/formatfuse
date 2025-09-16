import { describe, it, expect } from "vitest";
import {
  sanitizeColorInput,
  detectColorFormat,
} from "@/components/converters/ColorConverter";

describe("sanitizeColorInput", () => {
  const sanitizeCases = [
    {
      input: "lab(98.2596% - .247831 -.706788);",
      expected: "lab(98.2596% -0.247831 -0.706788)",
      reason: "handles stray punctuation and decimal values without leading zero",
    },
    {
      input: "background-color: #112233 !important;",
      expected: "#112233",
      reason: "strips CSS property prefixes and !important",
    },
    {
      input: "'rgb(10, 20, 30);'",
      expected: "rgb(10, 20, 30)",
      reason: "removes wrapping quotes and trailing semicolons",
    },
    {
      input: "oklab(.72 .1 -.2",
      expected: "oklab(0.72 0.1 -0.2)",
      reason: "adds missing closing parenthesis and leading zeros",
    },
    {
      input: "paint: color(display-p3 0.3 0.4 0.5);",
      expected: "color(display-p3 0.3 0.4 0.5)",
      reason: "retains CSS color functions after property removal",
    },
    {
      input: "text color is #ff8800 in code",
      expected: "#ff8800",
      reason: "extracts hex token from surrounding text",
    },
    {
      input: "color(display-p3 0.5 0.2 0.3",
      expected: "color(display-p3 0.5 0.2 0.3)",
      reason: "repairs missing closing parenthesis on color function",
    },
  ];

  sanitizeCases.forEach(({ input, expected, reason }) => {
    it(reason, () => {
      expect(sanitizeColorInput(input)).toBe(expected);
    });
  });

  const unchangedCases = [
    "#3B82F6",
    "rgb(59, 130, 246)",
    "rgb(59 130 246)",
    "hsl(217, 91%, 60%)",
    "lab(64.9 -12.9 -46.2)",
    "color(display-p3 0.357 0.6 0.835)",
  ];

  unchangedCases.forEach((input) => {
    it(`leaves clean value \"${input}\" untouched`, () => {
      expect(sanitizeColorInput(input)).toBe(input);
    });
  });
});

describe("detectColorFormat with sanitized inputs", () => {
  const formatCases = [
    { input: "lab(98.2596% - .247831 -.706788);", expected: "lab" },
    { input: "background-color: #112233 !important;", expected: "hex" },
    { input: "'rgb(10, 20, 30);'", expected: "rgb" },
    { input: "oklab(.72 .1 -.2", expected: "oklab" },
    { input: "paint: color(display-p3 0.3 0.4 0.5);", expected: "p3" },
    { input: "text color is #ff8800 in code", expected: "hex" },
    { input: "color(xyz 0.3135 0.3486 0.8341)", expected: "xyz" },
    { input: "color(xyz-d50 0.2926 0.3393 0.6360)", expected: "xyz-d50" },
    { input: "hsv(217, 76%, 96%)", expected: "hsv" },
    { input: "hwb(217 23% 4%)", expected: "hwb" },
  ] as const;

  formatCases.forEach(({ input, expected }) => {
    it(`detects ${expected} from \"${input}\"`, () => {
      const sanitized = sanitizeColorInput(input);
      expect(detectColorFormat(sanitized)).toBe(expected);
    });
  });
});
