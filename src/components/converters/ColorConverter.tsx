import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Palette } from 'lucide-react';
import { toast } from 'sonner';
import Color from 'colorjs.io';

type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'hwb' | 'lab' | 'lch' | 'oklab' | 'oklch' | 'p3' | 'rec2020' | 'prophoto' | 'a98rgb' | 'xyz' | 'xyz-d50';

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

export function ColorConverter() {
  const [inputFormat, setInputFormat] = useState<ColorFormat>('hex');
  const [outputFormat, setOutputFormat] = useState<ColorFormat>('rgb');
  const [inputValue, setInputValue] = useState('#3B82F6');
  const [colorValues, setColorValues] = useState<ColorValues | null>(null);
  const [previewColor, setPreviewColor] = useState('#3B82F6');

  const parseInput = (value: string, format: ColorFormat): Color | null => {
    try {
      let color: Color;
      
      // Clean up input value
      value = value.trim();
      
      switch (format) {
        case 'hex':
          // Color.js can parse hex with or without #
          color = new Color(value.startsWith('#') ? value : `#${value}`);
          break;
          
        case 'rgb':
          // Handle both "r, g, b" and "rgb(r, g, b)" formats
          if (value.includes('rgb')) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (match) {
              color = new Color('srgb', [
                parseInt(match[1]) / 255,
                parseInt(match[2]) / 255,
                parseInt(match[3]) / 255
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'hsl':
          // Handle both "h, s%, l%" and "hsl(h, s%, l%)" formats
          if (value.includes('hsl')) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
            if (match) {
              color = new Color('hsl', [
                parseInt(match[1]),
                parseInt(match[2]),
                parseInt(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'hsv':
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
            
            let r = 0, g = 0, b = 0;
            if (h >= 0 && h < 60) {
              r = c; g = x; b = 0;
            } else if (h >= 60 && h < 120) {
              r = x; g = c; b = 0;
            } else if (h >= 120 && h < 180) {
              r = 0; g = c; b = x;
            } else if (h >= 180 && h < 240) {
              r = 0; g = x; b = c;
            } else if (h >= 240 && h < 300) {
              r = x; g = 0; b = c;
            } else if (h >= 300 && h < 360) {
              r = c; g = 0; b = x;
            }
            
            color = new Color('srgb', [r + m, g + m, b + m]);
          } else {
            return null;
          }
          break;
          
        case 'hwb':
          if (value.includes('hwb')) {
            color = new Color(value);
          } else {
            const match = value.match(/(\d+)\s*,?\s*(\d+)%?\s*,?\s*(\d+)%?/);
            if (match) {
              color = new Color('hwb', [
                parseInt(match[1]),
                parseInt(match[2]),
                parseInt(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'lab':
          if (value.includes('lab')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('lab', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'lch':
          if (value.includes('lch')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('lch', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'oklab':
          if (value.includes('oklab')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('oklab', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'oklch':
          if (value.includes('oklch')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('oklch', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'p3':
          if (value.includes('display-p3') || value.includes('p3')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('p3', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'rec2020':
          if (value.includes('rec2020')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('rec2020', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'prophoto':
          if (value.includes('prophoto-rgb') || value.includes('prophoto')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('prophoto', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'a98rgb':
          if (value.includes('a98-rgb')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color('a98rgb', [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
              ]);
            } else {
              return null;
            }
          }
          break;
          
        case 'xyz':
        case 'xyz-d50':
          const space = format === 'xyz' ? 'xyz-d65' : 'xyz-d50';
          if (value.includes('xyz')) {
            color = new Color(value);
          } else {
            const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              color = new Color(space, [
                parseFloat(match[1]),
                parseFloat(match[2]),
                parseFloat(match[3])
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
      case 'hex':
        return color.to('srgb').toString({format: 'hex'});
        
      case 'rgb':
        const rgb = color.to('srgb');
        const [r, g, b] = rgb.coords.map(c => Math.round(c * 255));
        return `rgb(${r}, ${g}, ${b})`;
        
      case 'hsl':
        const hsl = color.to('hsl');
        return `hsl(${Math.round(hsl.coords[0])}, ${Math.round(hsl.coords[1])}%, ${Math.round(hsl.coords[2])}%)`;
        
      case 'hsv':
        // Convert to HSV manually
        const srgb = color.to('srgb');
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
        
      case 'hwb':
        const hwb = color.to('hwb');
        return `hwb(${Math.round(hwb.coords[0])} ${Math.round(hwb.coords[1])}% ${Math.round(hwb.coords[2])}%)`;
        
      case 'lab':
        const lab = color.to('lab');
        return `lab(${lab.coords[0].toFixed(1)} ${lab.coords[1].toFixed(1)} ${lab.coords[2].toFixed(1)})`;
        
      case 'lch':
        const lch = color.to('lch');
        return `lch(${lch.coords[0].toFixed(1)} ${lch.coords[1].toFixed(1)} ${lch.coords[2].toFixed(1)})`;
        
      case 'oklab':
        const oklab = color.to('oklab');
        return `oklab(${oklab.coords[0].toFixed(3)} ${oklab.coords[1].toFixed(3)} ${oklab.coords[2].toFixed(3)})`;
        
      case 'oklch':
        const oklch = color.to('oklch');
        return `oklch(${oklch.coords[0].toFixed(3)} ${oklch.coords[1].toFixed(3)} ${oklch.coords[2].toFixed(1)})`;
        
      case 'p3':
        const p3 = color.to('p3');
        return `color(display-p3 ${p3.coords[0].toFixed(3)} ${p3.coords[1].toFixed(3)} ${p3.coords[2].toFixed(3)})`;
        
      case 'rec2020':
        const rec2020 = color.to('rec2020');
        return `color(rec2020 ${rec2020.coords[0].toFixed(3)} ${rec2020.coords[1].toFixed(3)} ${rec2020.coords[2].toFixed(3)})`;
        
      case 'prophoto':
        const prophoto = color.to('prophoto');
        return `color(prophoto-rgb ${prophoto.coords[0].toFixed(3)} ${prophoto.coords[1].toFixed(3)} ${prophoto.coords[2].toFixed(3)})`;
        
      case 'a98rgb':
        const a98rgb = color.to('a98rgb');
        return `color(a98-rgb ${a98rgb.coords[0].toFixed(3)} ${a98rgb.coords[1].toFixed(3)} ${a98rgb.coords[2].toFixed(3)})`;
        
      case 'xyz':
        const xyz = color.to('xyz-d65');
        return `color(xyz ${xyz.coords[0].toFixed(4)} ${xyz.coords[1].toFixed(4)} ${xyz.coords[2].toFixed(4)})`;
        
      case 'xyz-d50':
        const xyzD50 = color.to('xyz-d50');
        return `color(xyz-d50 ${xyzD50.coords[0].toFixed(4)} ${xyzD50.coords[1].toFixed(4)} ${xyzD50.coords[2].toFixed(4)})`;
        
      default:
        return '';
    }
  };

  const handleConvert = () => {
    const color = parseInput(inputValue, inputFormat);
    if (color) {
      const values: ColorValues = {
        hex: formatColorValue(color, 'hex'),
        rgb: formatColorValue(color, 'rgb'),
        hsl: formatColorValue(color, 'hsl'),
        hsv: formatColorValue(color, 'hsv'),
        hwb: formatColorValue(color, 'hwb'),
        lab: formatColorValue(color, 'lab'),
        lch: formatColorValue(color, 'lch'),
        oklab: formatColorValue(color, 'oklab'),
        oklch: formatColorValue(color, 'oklch'),
        p3: formatColorValue(color, 'p3'),
        rec2020: formatColorValue(color, 'rec2020'),
        prophoto: formatColorValue(color, 'prophoto'),
        a98rgb: formatColorValue(color, 'a98rgb'),
        xyz: formatColorValue(color, 'xyz'),
        xyzD50: formatColorValue(color, 'xyz-d50'),
      };
      
      setColorValues(values);
      setPreviewColor(values.hex);
    } else {
      toast.error('Invalid color format. Please check your input.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  useEffect(() => {
    handleConvert();
  }, []);

  const getPlaceholder = (format: ColorFormat): string => {
    switch (format) {
      case 'hex': return '#3B82F6 or 3B82F6';
      case 'rgb': return '59, 130, 246 or rgb(59, 130, 246)';
      case 'hsl': return '217, 91%, 60% or hsl(217, 91%, 60%)';
      case 'hsv': return '217, 76%, 96% or hsv(217, 76%, 96%)';
      case 'hwb': return '217 24% 4% or hwb(217 24% 4%)';
      case 'lab': return '54.3 48.6 -36.5 or lab(54.3 48.6 -36.5)';
      case 'lch': return '54.3 60.6 323.1 or lch(54.3 60.6 323.1)';
      case 'oklab': return '0.623 0.076 -0.115 or oklab(0.623 0.076 -0.115)';
      case 'oklch': return '0.623 0.138 303.5 or oklch(0.623 0.138 303.5)';
      case 'p3': return '0.329 0.510 0.965 or color(display-p3 0.329 0.510 0.965)';
      case 'rec2020': return '0.270 0.467 0.916 or color(rec2020 0.270 0.467 0.916)';
      case 'prophoto': return '0.362 0.468 0.827 or color(prophoto-rgb 0.362 0.468 0.827)';
      case 'a98rgb': return '0.379 0.509 0.929 or color(a98-rgb 0.379 0.509 0.929)';
      case 'xyz': return '0.1804 0.1838 0.7552 or color(xyz 0.1804 0.1838 0.7552)';
      case 'xyz-d50': return '0.1656 0.1771 0.5707 or color(xyz-d50 0.1656 0.1771 0.5707)';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Format Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="input-format">Input Format</Label>
                <Select value={inputFormat} onValueChange={(v) => setInputFormat(v as ColorFormat)}>
                  <SelectTrigger id="input-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">HEX</SelectItem>
                    <SelectItem value="rgb">RGB</SelectItem>
                    <SelectItem value="hsl">HSL</SelectItem>
                    <SelectItem value="hsv">HSV</SelectItem>
                    <SelectItem value="hwb">HWB</SelectItem>
                    <SelectItem value="lab">LAB</SelectItem>
                    <SelectItem value="lch">LCH</SelectItem>
                    <SelectItem value="oklab">OKLab</SelectItem>
                    <SelectItem value="oklch">OKLCH</SelectItem>
                    <SelectItem value="p3">Display P3</SelectItem>
                    <SelectItem value="rec2020">Rec. 2020</SelectItem>
                    <SelectItem value="prophoto">ProPhoto RGB</SelectItem>
                    <SelectItem value="a98rgb">Adobe RGB (1998)</SelectItem>
                    <SelectItem value="xyz">XYZ (D65)</SelectItem>
                    <SelectItem value="xyz-d50">XYZ (D50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="color-input">Color Value</Label>
                <Input
                  id="color-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder(inputFormat)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                />
              </div>

              <Button onClick={handleConvert} className="w-full">
                Convert Color
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Color Preview</Label>
                <div 
                  className="w-full h-32 rounded-lg border shadow-inner"
                  style={{ backgroundColor: previewColor }}
                />
              </div>
            </div>
          </div>

          {colorValues && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="output-format">Output Format</Label>
                <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as ColorFormat)}>
                  <SelectTrigger id="output-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">HEX</SelectItem>
                    <SelectItem value="rgb">RGB</SelectItem>
                    <SelectItem value="hsl">HSL</SelectItem>
                    <SelectItem value="hsv">HSV</SelectItem>
                    <SelectItem value="hwb">HWB</SelectItem>
                    <SelectItem value="lab">LAB</SelectItem>
                    <SelectItem value="lch">LCH</SelectItem>
                    <SelectItem value="oklab">OKLab</SelectItem>
                    <SelectItem value="oklch">OKLCH</SelectItem>
                    <SelectItem value="p3">Display P3</SelectItem>
                    <SelectItem value="rec2020">Rec. 2020</SelectItem>
                    <SelectItem value="prophoto">ProPhoto RGB</SelectItem>
                    <SelectItem value="a98rgb">Adobe RGB (1998)</SelectItem>
                    <SelectItem value="xyz">XYZ (D65)</SelectItem>
                    <SelectItem value="xyz-d50">XYZ (D50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono">
                    {colorValues[outputFormat === 'xyz-d50' ? 'xyzD50' : outputFormat as keyof ColorValues]}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(colorValues[outputFormat === 'xyz-d50' ? 'xyzD50' : outputFormat as keyof ColorValues])}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">All Formats</h3>
                <div className="grid gap-2">
                  {Object.entries({
                    hex: 'HEX',
                    rgb: 'RGB',
                    hsl: 'HSL',
                    hsv: 'HSV',
                    hwb: 'HWB',
                    lab: 'LAB',
                    lch: 'LCH',
                    oklab: 'OKLab',
                    oklch: 'OKLCH',
                    p3: 'Display P3',
                    rec2020: 'Rec. 2020',
                    prophoto: 'ProPhoto RGB',
                    a98rgb: 'Adobe RGB',
                    xyz: 'XYZ (D65)',
                    xyzD50: 'XYZ (D50)'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <code className="text-sm font-mono block truncate pr-2">
                          {colorValues[key as keyof ColorValues]}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(colorValues[key as keyof ColorValues])}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}