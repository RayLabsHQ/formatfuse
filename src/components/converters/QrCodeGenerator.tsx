import React, { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, Download, Copy, Check, Palette, Settings, 
  Wifi, User, Globe, Phone, Mail, Calendar, MapPin,
  Smartphone, CreditCard, Package, Share2, Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { cn } from '@/lib/utils';

interface QrTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
    placeholder: string;
    required?: boolean;
  }>;
  formatter: (data: Record<string, string>) => string;
}

const qrTemplates: QrTemplate[] = [
  {
    id: 'text',
    name: 'Text/URL',
    icon: Globe,
    description: 'Simple text or URL',
    fields: [
      { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Enter text or URL...', required: true }
    ],
    formatter: (data) => data.content
  },
  {
    id: 'wifi',
    name: 'WiFi',
    icon: Wifi,
    description: 'WiFi network credentials',
    fields: [
      { name: 'ssid', label: 'Network Name (SSID)', type: 'text', placeholder: 'MyNetwork', required: true },
      { name: 'password', label: 'Password', type: 'text', placeholder: 'Password123' },
      { name: 'security', label: 'Security', type: 'text', placeholder: 'WPA/WPA2', required: true }
    ],
    formatter: (data) => `WIFI:T:${data.security || 'WPA'};S:${data.ssid};P:${data.password || ''};;`
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    description: 'Pre-filled email message',
    fields: [
      { name: 'to', label: 'To', type: 'email', placeholder: 'recipient@example.com', required: true },
      { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
      { name: 'body', label: 'Message', type: 'textarea', placeholder: 'Email content...' }
    ],
    formatter: (data) => {
      const params = [];
      if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
      if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
      return `mailto:${data.to}${params.length ? '?' + params.join('&') : ''}`;
    }
  },
  {
    id: 'phone',
    name: 'Phone',
    icon: Phone,
    description: 'Phone number for calling',
    fields: [
      { name: 'number', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', required: true }
    ],
    formatter: (data) => `tel:${data.number}`
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: Smartphone,
    description: 'Pre-filled SMS message',
    fields: [
      { name: 'number', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', required: true },
      { name: 'message', label: 'Message', type: 'textarea', placeholder: 'SMS content...' }
    ],
    formatter: (data) => `sms:${data.number}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`
  },
  {
    id: 'vcard',
    name: 'Contact',
    icon: User,
    description: 'Contact information (vCard)',
    fields: [
      { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1234567890' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
      { name: 'company', label: 'Company', type: 'text', placeholder: 'Acme Inc.' },
      { name: 'url', label: 'Website', type: 'url', placeholder: 'https://example.com' }
    ],
    formatter: (data) => {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${data.firstName} ${data.lastName}`,
        `N:${data.lastName};${data.firstName};;;`
      ];
      if (data.phone) lines.push(`TEL:${data.phone}`);
      if (data.email) lines.push(`EMAIL:${data.email}`);
      if (data.company) lines.push(`ORG:${data.company}`);
      if (data.url) lines.push(`URL:${data.url}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
  },
  {
    id: 'event',
    name: 'Event',
    icon: Calendar,
    description: 'Calendar event',
    fields: [
      { name: 'title', label: 'Event Title', type: 'text', placeholder: 'Meeting', required: true },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'Conference Room' },
      { name: 'start', label: 'Start Date/Time', type: 'text', placeholder: '2024-01-01T10:00', required: true },
      { name: 'end', label: 'End Date/Time', type: 'text', placeholder: '2024-01-01T11:00', required: true },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Event details...' }
    ],
    formatter: (data) => {
      const lines = [
        'BEGIN:VEVENT',
        `SUMMARY:${data.title}`,
        `DTSTART:${data.start.replace(/[-:]/g, '')}`,
        `DTEND:${data.end.replace(/[-:]/g, '')}`
      ];
      if (data.location) lines.push(`LOCATION:${data.location}`);
      if (data.description) lines.push(`DESCRIPTION:${data.description}`);
      lines.push('END:VEVENT');
      return lines.join('\n');
    }
  },
  {
    id: 'location',
    name: 'Location',
    icon: MapPin,
    description: 'Geographic coordinates',
    fields: [
      { name: 'latitude', label: 'Latitude', type: 'text', placeholder: '37.7749', required: true },
      { name: 'longitude', label: 'Longitude', type: 'text', placeholder: '-122.4194', required: true }
    ],
    formatter: (data) => `geo:${data.latitude},${data.longitude}`
  }
];

interface QrStyle {
  size: number;
  margin: number;
  darkColor: string;
  lightColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

export default function QrCodeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<QrTemplate>(qrTemplates[0]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<QrStyle>({
    size: 300,
    margin: 4,
    darkColor: '#000000',
    lightColor: '#ffffff',
    errorCorrectionLevel: 'M'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate QR code
  const generateQrCode = useCallback(async () => {
    if (!canvasRef.current) return;

    // Check if required fields are filled
    const requiredFields = selectedTemplate.fields.filter(f => f.required);
    const hasAllRequired = requiredFields.every(f => formData[f.name]?.trim());
    if (!hasAllRequired) return;

    setIsGenerating(true);
    try {
      const qrData = selectedTemplate.formatter(formData);
      
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: style.size,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor
        },
        errorCorrectionLevel: style.errorCorrectionLevel
      });

      // Also generate data URL for download
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: style.size,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor
        },
        errorCorrectionLevel: style.errorCorrectionLevel
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, formData, style]);

  // Generate QR code when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      generateQrCode();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [generateQrCode]);

  // Handle form field changes
  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Download QR code
  const downloadQrCode = (format: 'png' | 'svg') => {
    if (!qrDataUrl && format === 'png') return;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    } else {
      // Generate SVG
      const qrData = selectedTemplate.formatter(formData);
      QRCode.toString(qrData, {
        type: 'svg',
        width: style.size,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor
        },
        errorCorrectionLevel: style.errorCorrectionLevel
      }, (err, svg) => {
        if (err) {
          console.error('Failed to generate SVG:', err);
          return;
        }
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qrcode-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  // Copy QR code as image
  const copyQrCode = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Reset form when template changes
  useEffect(() => {
    setFormData({});
  }, [selectedTemplate]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">QR Code Generator</h1>
        <p className="text-muted-foreground">
          Create QR codes for URLs, WiFi, contacts, and more
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <Label className="mb-3 block">QR Code Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {qrTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all hover:border-primary",
                    selectedTemplate.id === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <template.icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{template.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="space-y-4">
            {selectedTemplate.fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name} className="mb-1.5 block">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="resize-none"
                    rows={3}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Style Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium mb-4 hover:text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 rounded-lg border bg-secondary/30">
                {/* Size */}
                <div>
                  <Label className="mb-2 block">
                    Size: {style.size}px
                  </Label>
                  <Slider
                    value={[style.size]}
                    onValueChange={([value]) => setStyle(prev => ({ ...prev, size: value }))}
                    min={100}
                    max={500}
                    step={10}
                    className="mb-2"
                  />
                </div>

                {/* Margin */}
                <div>
                  <Label className="mb-2 block">
                    Margin: {style.margin}
                  </Label>
                  <Slider
                    value={[style.margin]}
                    onValueChange={([value]) => setStyle(prev => ({ ...prev, margin: value }))}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dark-color" className="mb-1.5 block">
                      Foreground Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="dark-color"
                        type="color"
                        value={style.darkColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, darkColor: e.target.value }))}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={style.darkColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, darkColor: e.target.value }))}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="light-color" className="mb-1.5 block">
                      Background Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="light-color"
                        type="color"
                        value={style.lightColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, lightColor: e.target.value }))}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={style.lightColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, lightColor: e.target.value }))}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Correction */}
                <div>
                  <Label className="mb-2 block">Error Correction Level</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setStyle(prev => ({ ...prev, errorCorrectionLevel: level }))}
                        className={cn(
                          "py-2 px-3 rounded-md text-sm font-medium transition-colors",
                          style.errorCorrectionLevel === level
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80"
                        )}
                      >
                        {level} ({level === 'L' ? '7%' : level === 'M' ? '15%' : level === 'Q' ? '25%' : '30%'})
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher levels allow more damage but reduce data capacity
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            <div className="p-8 rounded-lg border bg-white dark:bg-secondary">
              <canvas
                ref={canvasRef}
                className={cn(
                  "transition-opacity",
                  isGenerating ? "opacity-50" : "opacity-100"
                )}
              />
            </div>

            {/* Action Buttons */}
            {qrDataUrl && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={copyQrCode}
                  variant="outline"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => downloadQrCode('png')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
                <Button
                  onClick={() => downloadQrCode('svg')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  SVG
                </Button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="p-4 rounded-lg border bg-secondary/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Pro Tips</h3>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Test your QR code with a phone before printing</li>
              <li>• Use high error correction for printed codes</li>
              <li>• Keep a quiet zone (margin) around the code</li>
              <li>• Avoid very light colors for better scanning</li>
              <li>• SVG format is best for large prints</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <Share2 className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Multiple Formats</h3>
          <p className="text-sm text-muted-foreground">
            Generate QR codes for URLs, WiFi, contacts, events, and more
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Palette className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Customizable</h3>
          <p className="text-sm text-muted-foreground">
            Adjust colors, size, and error correction level
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Package className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Export Options</h3>
          <p className="text-sm text-muted-foreground">
            Download as PNG or SVG for any use case
          </p>
        </div>
      </div>
    </div>
  );
}