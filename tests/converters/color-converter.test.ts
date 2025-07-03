import { describe, it, expect } from "vitest";
import Color from "colorjs.io";

// Test color conversion using Color.js
describe("Color Converter with Color.js", () => {
  describe("Basic color parsing", () => {
    it("should parse HEX colors correctly", () => {
      const testCases = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFFFF",
        "#000000",
        "#3B82F6",
      ];

      testCases.forEach((hex) => {
        const color = new Color(hex);
        expect(color).toBeDefined();
        // Color.js may use shorthand notation for hex
        const hexOutput = color.toString({ format: "hex" });
        expect(hexOutput).toMatch(/^#[0-9a-f]{3,6}$/i);
      });
    });

    it("should parse RGB colors correctly", () => {
      const testCases = [
        "rgb(255, 0, 0)",
        "rgb(0, 255, 0)",
        "rgb(0, 0, 255)",
        "rgb(255, 255, 255)",
        "rgb(0, 0, 0)",
        "rgb(59, 130, 246)",
      ];

      testCases.forEach((rgb) => {
        const color = new Color(rgb);
        expect(color).toBeDefined();
        expect(color.space.id).toBe("srgb");
      });
    });

    it("should parse HSL colors correctly", () => {
      const testCases = [
        "hsl(0, 100%, 50%)",
        "hsl(120, 100%, 50%)",
        "hsl(240, 100%, 50%)",
        "hsl(0, 0%, 100%)",
        "hsl(0, 0%, 0%)",
      ];

      testCases.forEach((hsl) => {
        const color = new Color(hsl);
        expect(color).toBeDefined();
        expect(color.space.id).toBe("hsl");
      });
    });
  });

  describe("Color space conversions", () => {
    it("should convert between HEX and RGB", () => {
      const color = new Color("#3B82F6");
      const rgb = color.to("srgb");
      const [r, g, b] = rgb.coords.map((c) => Math.round(c * 255));

      expect(r).toBe(59);
      expect(g).toBe(130);
      expect(b).toBe(246);
    });

    it("should convert between RGB and HSL", () => {
      const color = new Color("rgb(255, 0, 0)");
      const hsl = color.to("hsl");

      expect(Math.round(hsl.coords[0])).toBe(0);
      expect(Math.round(hsl.coords[1])).toBe(100);
      expect(Math.round(hsl.coords[2])).toBe(50);
    });

    it("should convert to LAB color space", () => {
      const color = new Color("#3B82F6");
      const lab = color.to("lab");

      // Color.js uses more precise calculations
      expect(lab.coords[0]).toBeCloseTo(54.3, 0);
      expect(lab.coords[1]).toBeGreaterThan(0); // Positive a* value
      expect(lab.coords[2]).toBeLessThan(0); // Negative b* value (blue)
    });

    it("should convert to LCH color space", () => {
      const color = new Color("#3B82F6");
      const lch = color.to("lch");

      expect(lch.coords[0]).toBeCloseTo(54.3, 0);
      expect(lch.coords[1]).toBeGreaterThan(50); // Chroma value
      expect(lch.coords[2]).toBeGreaterThan(270); // Hue angle in blue range
    });

    it("should convert to OKLab color space", () => {
      const color = new Color("#3B82F6");
      const oklab = color.to("oklab");

      expect(oklab).toBeDefined();
      expect(oklab.coords.length).toBe(3);
    });

    it("should convert to Display P3 color space", () => {
      const color = new Color("#3B82F6");
      const p3 = color.to("p3");

      expect(p3).toBeDefined();
      expect(p3.space.id).toBe("p3");
    });

    it("should convert to Rec. 2020 color space", () => {
      const color = new Color("#3B82F6");
      const rec2020 = color.to("rec2020");

      expect(rec2020).toBeDefined();
      expect(rec2020.space.id).toBe("rec2020");
    });
  });

  describe("CSS Color 4 format parsing", () => {
    it("should parse color() function syntax", () => {
      const testCases = [
        "color(display-p3 0.329 0.510 0.965)",
        "color(rec2020 0.270 0.467 0.916)",
        "color(a98-rgb 0.379 0.509 0.929)",
        "color(prophoto-rgb 0.362 0.468 0.827)",
      ];

      testCases.forEach((colorStr) => {
        const color = new Color(colorStr);
        expect(color).toBeDefined();
      });
    });

    it("should parse modern color syntax", () => {
      const testCases = [
        "lab(54.3 48.6 -59.5)",
        "lch(54.3 76.8 309.4)",
        "oklab(0.623 0.076 -0.115)",
        "oklch(0.623 0.138 303.5)",
        "hwb(217 24% 4%)",
      ];

      testCases.forEach((colorStr) => {
        const color = new Color(colorStr);
        expect(color).toBeDefined();
      });
    });
  });

  describe("Color output formatting", () => {
    it("should format colors correctly", () => {
      const color = new Color("#3B82F6");

      // Test HEX output
      expect(color.to("srgb").toString({ format: "hex" })).toBe("#3b82f6");

      // Test RGB output
      const rgb = color.to("srgb");
      const [r, g, b] = rgb.coords.map((c) => Math.round(c * 255));
      expect(`rgb(${r}, ${g}, ${b})`).toBe("rgb(59, 130, 246)");

      // Test HSL output
      const hsl = color.to("hsl");
      const hslStr = `hsl(${Math.round(hsl.coords[0])}, ${Math.round(hsl.coords[1])}%, ${Math.round(hsl.coords[2])}%)`;
      expect(hslStr).toMatch(/hsl\(\d+, \d+%, \d+%\)/);
    });
  });

  describe("Edge cases", () => {
    it("should handle white and black colors", () => {
      const white = new Color("#FFFFFF");
      const black = new Color("#000000");

      // Color.js may use shorthand for white/black
      expect(white.to("srgb").toString({ format: "hex" })).toMatch(
        /^#fff(fff)?$/i,
      );
      expect(black.to("srgb").toString({ format: "hex" })).toMatch(
        /^#000(000)?$/i,
      );

      const whiteLab = white.to("lab");
      expect(whiteLab.coords[0]).toBeCloseTo(100, 0);

      const blackLab = black.to("lab");
      expect(blackLab.coords[0]).toBeCloseTo(0, 0);
    });

    it("should handle colors outside sRGB gamut", () => {
      // Very saturated green in P3
      const p3Green = new Color("color(display-p3 0 1 0)");
      const srgb = p3Green.to("srgb");

      // Color.js should handle gamut mapping
      expect(srgb).toBeDefined();
    });
  });
});
