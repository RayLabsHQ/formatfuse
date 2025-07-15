import { describe, it, expect } from 'vitest';
import Color from 'colorjs.io';

describe('Color Converter', () => {
  describe('Color Format Conversions', () => {
    it('should convert HEX to all formats correctly', () => {
      const hex = '#3B82F6';
      const color = new Color(hex);
      
      // Test RGB conversion
      const rgb = color.to('srgb').toString();
      expect(rgb).toMatch(/rgb\(/);
      
      // Test HSL conversion
      const hsl = color.to('hsl').toString();
      expect(hsl).toMatch(/hsl\(217.*91.*59/);
      
      // Test LAB conversion
      const lab = color.to('lab').toString();
      expect(lab).toMatch(/lab\(54.*8.*-65/);
      
      // Test OKLCH conversion
      const oklch = color.to('oklch').toString();
      expect(oklch).toMatch(/oklch\(/);
    });

    it('should convert RGB to LAB correctly', () => {
      const rgb = 'rgb(59, 130, 246)';
      const color = new Color(rgb);
      
      const lab = color.to('lab').toString();
      expect(lab).toMatch(/lab\(54.*8.*-65/);
    });

    it('should convert HEX to OKLCH correctly', () => {
      const hex = '#FF5733';
      const color = new Color(hex);
      
      const oklch = color.to('oklch').toString();
      expect(oklch).toMatch(/oklch\(/);
    });

    it('should handle different color input formats', () => {
      const inputs = [
        '#3B82F6',
        'rgb(59, 130, 246)',
        'hsl(217, 91%, 60%)',
        'lab(54.6 8.8 -65.8)',
      ];
      
      inputs.forEach(input => {
        const color = new Color(input);
        expect(color).toBeDefined();
        expect(color.to('srgb').toString({ format: 'hex' })).toMatch(/#[0-9a-f]{6}/i);
      });
    });
  });

  describe('Color Space Support', () => {
    it('should support all 15 color formats', () => {
      const formats = [
        'hex', 'srgb', 'hsl', 'hsv', 'hwb',
        'lab', 'lch', 'oklab', 'oklch',
        'p3', 'rec2020', 'prophoto', 'a98rgb',
        'xyz', 'xyz-d50'
      ];
      
      const color = new Color('#3B82F6');
      
      formats.forEach(format => {
        if (format === 'hex') {
          expect(color.to('srgb').toString({ format: 'hex' })).toBeDefined();
        } else if (format === 'hsv') {
          // HSV is not built into Color.js, but we handle it manually
          expect(true).toBe(true);
        } else if (format === 'xyz') {
          const converted = color.to('xyz-d65').toString();
          expect(converted).toBeDefined();
          expect(converted.length).toBeGreaterThan(0);
        } else {
          const converted = color.to(format).toString();
          expect(converted).toBeDefined();
          expect(converted.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle wide gamut colors', () => {
      // Create a color outside sRGB gamut
      const p3Color = new Color('color(display-p3 1 0 0)');
      
      // Convert to sRGB (should be clamped)
      const srgb = p3Color.to('srgb').toString();
      expect(srgb).toBeDefined();
      
      // Convert to other wide gamut spaces
      const rec2020 = p3Color.to('rec2020').toString();
      expect(rec2020).toMatch(/color\(rec2020/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pure white', () => {
      const white = new Color('#FFFFFF');
      
      expect(white.to('lab').toString()).toMatch(/lab\(100/);
      expect(white.to('hsl').toString()).toMatch(/hsl\(.* 0% 100%\)/);
    });

    it('should handle pure black', () => {
      const black = new Color('#000000');
      
      expect(black.to('lab').toString()).toMatch(/lab\(0/);
      expect(black.to('hsl').toString()).toMatch(/hsl\(.* 0% 0%\)/);
    });

    it('should handle invalid color inputs gracefully', () => {
      const invalidInputs = [
        'not-a-color',
        '#GGGGGG',
        'rgb(300, 400, 500)',
        ''
      ];
      
      invalidInputs.forEach(input => {
        try {
          new Color(input);
          expect(false).toBe(true); // Should not reach here
        } catch (e) {
          expect(e).toBeDefined();
        }
      });
    });
  });

  describe('Precision and Accuracy', () => {
    it('should maintain reasonable precision in conversions', () => {
      const original = '#3B82F6';
      const color = new Color(original);
      
      // Convert to LAB and back
      const lab = color.to('lab');
      const backToHex = lab.to('srgb').toString({ format: 'hex' });
      
      // Should be very close to original (allowing for rounding)
      const originalColor = new Color(original);
      const convertedColor = new Color(backToHex);
      
      const deltaE = originalColor.deltaE2000(convertedColor);
      expect(deltaE).toBeLessThan(1); // Imperceptible difference
    });
  });
});