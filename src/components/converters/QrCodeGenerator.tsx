import React, { useState, useCallback, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Copy,
  Check,
  Palette,
  Wifi,
  Phone,
  Mail,
  Hash,
  Binary,
  Key,
  Shield,
  Zap,
  Link,
  MessageSquare,
  Users,
  Navigation,
  CalendarDays,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Slider } from "../ui/slider";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";

interface QrTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "tel" | "url" | "textarea";
    placeholder: string;
    required?: boolean;
  }>;
  formatter: (data: Record<string, string>) => string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Generate QR codes locally",
  },
  {
    icon: Zap,
    text: "Multiple formats",
    description: "WiFi, vCard, URLs & more",
  },
  {
    icon: Palette,
    text: "Customizable",
    description: "Colors, size & error correction",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: Binary,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA hashes",
    icon: Hash,
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate unique IDs",
    icon: Key,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a QR code?",
    answer:
      "QR (Quick Response) codes are two-dimensional barcodes that can store various types of data including URLs, text, contact information, WiFi credentials, and more. They can be scanned by smartphone cameras for quick access to the encoded information.",
  },
  {
    question: "What's the difference between error correction levels?",
    answer:
      "Error correction allows QR codes to be read even if partially damaged. L (Low) recovers 7% damage, M (Medium) 15%, Q (Quartile) 25%, and H (High) 30%. Higher levels provide better resilience but reduce data capacity. Use H for printed codes that might get damaged.",
  },
  {
    question: "Can I add a logo to my QR code?",
    answer:
      "Yes! You can add a logo to the center of your QR code. Use high error correction (H) to ensure the code remains scannable. The logo should be simple and not cover more than 30% of the QR code area.",
  },
  {
    question: "What's the best format for printing?",
    answer:
      "SVG is best for printing as it's a vector format that scales without quality loss. For digital use, PNG works well. Always test your QR code before mass printing and ensure adequate contrast between foreground and background colors.",
  },
];

const qrTemplates: QrTemplate[] = [
  {
    id: "url",
    name: "URL",
    icon: Link,
    description: "Website link",
    fields: [
      {
        name: "url",
        label: "URL",
        type: "url",
        placeholder: "https://raylabs.io",
        required: true,
      },
    ],
    formatter: (data) => data.url,
  },
  {
    id: "wifi",
    name: "WiFi",
    icon: Wifi,
    description: "Network credentials",
    fields: [
      {
        name: "ssid",
        label: "Network Name (SSID)",
        type: "text",
        placeholder: "MyNetwork",
        required: true,
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        placeholder: "Password123",
      },
      {
        name: "security",
        label: "Security",
        type: "text",
        placeholder: "WPA/WPA2",
        required: true,
      },
    ],
    formatter: (data) =>
      `WIFI:T:${data.security || "WPA"};S:${data.ssid};P:${data.password || ""};;`,
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    description: "Email message",
    fields: [
      {
        name: "to",
        label: "To",
        type: "email",
        placeholder: "recipient@raylabs.io",
        required: true,
      },
      {
        name: "subject",
        label: "Subject",
        type: "text",
        placeholder: "Email subject",
      },
      {
        name: "body",
        label: "Message",
        type: "textarea",
        placeholder: "Email content...",
      },
    ],
    formatter: (data) => {
      const params = [];
      if (data.subject)
        params.push(`subject=${encodeURIComponent(data.subject)}`);
      if (data.body) params.push(`body=${encodeURIComponent(data.body)}`);
      return `mailto:${data.to}${params.length ? "?" + params.join("&") : ""}`;
    },
  },
  {
    id: "phone",
    name: "Phone",
    icon: Phone,
    description: "Phone call",
    fields: [
      {
        name: "number",
        label: "Phone Number",
        type: "tel",
        placeholder: "+1234567890",
        required: true,
      },
    ],
    formatter: (data) => `tel:${data.number}`,
  },
  {
    id: "sms",
    name: "SMS",
    icon: MessageSquare,
    description: "Text message",
    fields: [
      {
        name: "number",
        label: "Phone Number",
        type: "tel",
        placeholder: "+1234567890",
        required: true,
      },
      {
        name: "message",
        label: "Message",
        type: "textarea",
        placeholder: "SMS content...",
      },
    ],
    formatter: (data) =>
      `sms:${data.number}${data.message ? `?body=${encodeURIComponent(data.message)}` : ""}`,
  },
  {
    id: "vcard",
    name: "Contact",
    icon: Users,
    description: "Contact card",
    fields: [
      {
        name: "firstName",
        label: "First Name",
        type: "text",
        placeholder: "John",
        required: true,
      },
      {
        name: "lastName",
        label: "Last Name",
        type: "text",
        placeholder: "Doe",
        required: true,
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        placeholder: "+1234567890",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "john@raylabs.io",
      },
      {
        name: "company",
        label: "Company",
        type: "text",
        placeholder: "Acme Inc.",
      },
      {
        name: "url",
        label: "Website",
        type: "url",
        placeholder: "https://raylabs.io",
      },
    ],
    formatter: (data) => {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${data.firstName} ${data.lastName}`,
        `N:${data.lastName};${data.firstName};;;`,
      ];
      if (data.phone) lines.push(`TEL:${data.phone}`);
      if (data.email) lines.push(`EMAIL:${data.email}`);
      if (data.company) lines.push(`ORG:${data.company}`);
      if (data.url) lines.push(`URL:${data.url}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    },
  },
  {
    id: "event",
    name: "Event",
    icon: CalendarDays,
    description: "Calendar event",
    fields: [
      {
        name: "title",
        label: "Event Title",
        type: "text",
        placeholder: "Meeting",
        required: true,
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Conference Room",
      },
      {
        name: "start",
        label: "Start Date/Time",
        type: "text",
        placeholder: "2024-01-01T10:00",
        required: true,
      },
      {
        name: "end",
        label: "End Date/Time",
        type: "text",
        placeholder: "2024-01-01T11:00",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Event details...",
      },
    ],
    formatter: (data) => {
      const lines = [
        "BEGIN:VEVENT",
        `SUMMARY:${data.title}`,
        `DTSTART:${data.start.replace(/[-:]/g, "")}`,
        `DTEND:${data.end.replace(/[-:]/g, "")}`,
      ];
      if (data.location) lines.push(`LOCATION:${data.location}`);
      if (data.description) lines.push(`DESCRIPTION:${data.description}`);
      lines.push("END:VEVENT");
      return lines.join("\n");
    },
  },
  {
    id: "location",
    name: "Location",
    icon: Navigation,
    description: "GPS coordinates",
    fields: [
      {
        name: "latitude",
        label: "Latitude",
        type: "text",
        placeholder: "37.7749",
        required: true,
      },
      {
        name: "longitude",
        label: "Longitude",
        type: "text",
        placeholder: "-122.4194",
        required: true,
      },
    ],
    formatter: (data) => `geo:${data.latitude},${data.longitude}`,
  },
  {
    id: "text",
    name: "Text",
    icon: MessageSquare,
    description: "Plain text",
    fields: [
      {
        name: "content",
        label: "Text Content",
        type: "textarea",
        placeholder: "Enter your text here...",
        required: true,
      },
    ],
    formatter: (data) => data.content,
  },
];

interface QrStyle {
  size: number;
  margin: number;
  darkColor: string;
  lightColor: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  logo?: string;
  logoSize?: number;
}

export default function QrCodeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<QrTemplate>(
    qrTemplates[0],
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<QrStyle>({
    size: 300,
    margin: 4,
    darkColor: "#000000",
    lightColor: "#ffffff",
    errorCorrectionLevel: "M",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate QR code
  const generateQrCode = useCallback(async () => {
    if (!canvasRef.current) return;

    // Check if required fields are filled
    const requiredFields = selectedTemplate.fields.filter((f) => f.required);
    const hasAllRequired = requiredFields.every((f) =>
      formData[f.name]?.trim(),
    );
    if (!hasAllRequired) return;

    setIsGenerating(true);
    try {
      const qrData = selectedTemplate.formatter(formData);

      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: style.size,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor,
        },
        errorCorrectionLevel: style.errorCorrectionLevel,
      });

      // Add logo if provided
      if (style.logo && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          const logoImg = new Image();
          logoImg.onload = () => {
            const logoSize = style.logoSize || 60;
            const x = (style.size - logoSize) / 2;
            const y = (style.size - logoSize) / 2;

            // Draw white background for logo
            ctx.fillStyle = style.lightColor;
            ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);

            // Draw logo
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          };
          logoImg.src = style.logo;
        }
      }

      // Also generate data URL for download
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: style.size,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor,
        },
        errorCorrectionLevel: style.errorCorrectionLevel,
      });

      // Add logo to data URL version
      if (style.logo) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = style.size;
          canvas.height = style.size;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            const qrImg = new Image();
            qrImg.onload = () => {
              ctx.drawImage(qrImg, 0, 0);

              const logoSize = style.logoSize || 60;
              const x = (style.size - logoSize) / 2;
              const y = (style.size - logoSize) / 2;

              ctx.fillStyle = style.lightColor;
              ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
              ctx.drawImage(img, x, y, logoSize, logoSize);

              setQrDataUrl(canvas.toDataURL());
            };
            qrImg.src = dataUrl;
          }
        };
        img.src = style.logo;
      } else {
        setQrDataUrl(dataUrl);
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Download QR code
  const downloadQrCode = (format: "png" | "svg") => {
    if (!qrDataUrl && format === "png") return;

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `qrcode-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    } else {
      // Generate SVG
      const qrData = selectedTemplate.formatter(formData);
      QRCode.toString(
        qrData,
        {
          type: "svg",
          width: style.size,
          margin: style.margin,
          color: {
            dark: style.darkColor,
            light: style.lightColor,
          },
          errorCorrectionLevel: style.errorCorrectionLevel,
        },
        (err: Error | null | undefined, svg: string) => {
          if (err) {
            console.error("Failed to generate SVG:", err);
            return;
          }
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `qrcode-${Date.now()}.svg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success(`Downloaded as ${format.toUpperCase()}`);
        },
      );
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
            "image/png": blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("QR code copied");
      });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Reset form when template changes
  useEffect(() => {
    setFormData({});
  }, [selectedTemplate]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Gradient Blobs - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "QR Code", main: "Generator" }}
          subtitle="Create customizable QR codes instantly. Perfect for URLs, WiFi, contacts, and more."
          badge={{ text: "Free QR Code Maker Online", icon: Zap }}
          features={features}
        />

        {/* Main Content - Side by Side on Desktop */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Left Side - Input */}
          <div className="flex-1 lg:max-w-md flex flex-col">
            <Card className="flex-1 shadow-lg hover:shadow-xl transition-shadow duration-300 border-muted/50 bg-background/95 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6 h-full overflow-y-auto">
                {/* Template Selection */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-4 block">
                    Choose Type
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {qrTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-all hover:scale-105 group",
                          selectedTemplate.id === template.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:border-primary/50 bg-background",
                        )}
                      >
                        <template.icon
                          className={cn(
                            "w-5 h-5 mx-auto mb-2 transition-colors",
                            selectedTemplate.id === template.id
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary",
                          )}
                        />
                        <div className="text-xs font-medium">
                          {template.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {selectedTemplate.name} Details
                  </h3>
                  {selectedTemplate.fields.map((field) => (
                    <div key={field.name}>
                      <Label
                        htmlFor={field.name}
                        className="mb-2 block text-sm"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.name}
                          value={formData[field.name] || ""}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          placeholder={field.placeholder}
                          className="resize-none"
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type}
                          value={formData[field.name] || ""}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Styling Options */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Styling
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs"
                    >
                      {showAdvanced ? "Hide" : "Show"} Advanced
                    </Button>
                  </div>

                  {/* Basic Styling */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="dark-color"
                        className="mb-2 block text-sm"
                      >
                        Foreground
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="dark-color"
                          type="color"
                          value={style.darkColor}
                          onChange={(e) =>
                            setStyle((prev) => ({
                              ...prev,
                              darkColor: e.target.value,
                            }))
                          }
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={style.darkColor}
                          onChange={(e) =>
                            setStyle((prev) => ({
                              ...prev,
                              darkColor: e.target.value,
                            }))
                          }
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="light-color"
                        className="mb-2 block text-sm"
                      >
                        Background
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="light-color"
                          type="color"
                          value={style.lightColor}
                          onChange={(e) =>
                            setStyle((prev) => ({
                              ...prev,
                              lightColor: e.target.value,
                            }))
                          }
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={style.lightColor}
                          onChange={(e) =>
                            setStyle((prev) => ({
                              ...prev,
                              lightColor: e.target.value,
                            }))
                          }
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  {showAdvanced && (
                    <div className="space-y-4 pt-2 animate-fade-in">
                      {/* Size and Margin */}
                      <div>
                        <Label className="mb-2 block text-sm">
                          Size: {style.size}px
                        </Label>
                        <div className="flex gap-3 items-center">
                          <Slider
                            value={[style.size]}
                            onValueChange={([value]) =>
                              setStyle((prev) => ({ ...prev, size: value }))
                            }
                            min={100}
                            max={500}
                            step={10}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={style.size}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 100;
                              setStyle((prev) => ({
                                ...prev,
                                size: Math.min(Math.max(value, 100), 500),
                              }));
                            }}
                            className="w-20 text-xs"
                            min={100}
                            max={500}
                          />
                        </div>
                      </div>

                      {/* Error Correction */}
                      <div>
                        <Label className="mb-3 block text-sm">
                          Error Correction
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {(["L", "M", "Q", "H"] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() =>
                                setStyle((prev) => ({
                                  ...prev,
                                  errorCorrectionLevel: level,
                                }))
                              }
                              className={cn(
                                "py-1.5 px-2 rounded-md text-xs font-medium transition-all",
                                style.errorCorrectionLevel === level
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary hover:bg-secondary/80",
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          L: 7%, M: 15%, Q: 25%, H: 30% damage recovery
                        </p>
                      </div>

                      {/* Logo Upload */}
                      <div>
                        <Label className="mb-2 block text-sm">
                          Logo (Optional)
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setStyle((prev) => ({
                                  ...prev,
                                  logo: e.target?.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="cursor-pointer text-xs"
                        />
                        {style.logo && (
                          <div className="flex items-center gap-3 mt-2">
                            <img
                              src={style.logo}
                              alt="Logo"
                              className="w-10 h-10 rounded object-contain bg-muted"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setStyle((prev) => ({
                                  ...prev,
                                  logo: undefined,
                                  logoSize: undefined,
                                }))
                              }
                              className="text-xs"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Output (Desktop) / Second Card (Mobile) */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex shadow-lg hover:shadow-xl transition-shadow duration-300 border-muted/50 bg-background/95 backdrop-blur-sm overflow-hidden">
              <CardContent className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
                {!qrDataUrl ? (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-10 h-10 text-primary/60" />
                    </div>
                    <p className="text-muted-foreground">
                      Fill in the details to generate your QR code
                    </p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Your QR code will appear here instantly
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <div className="qr-output-container p-4 sm:p-6 rounded-2xl border bg-white dark:bg-muted/30 w-full sm:w-auto">
                      <div className="relative overflow-auto max-h-full">
                        <canvas
                          ref={canvasRef}
                          width={style.size}
                          height={style.size}
                          className={cn(
                            "transition-opacity block mx-auto",
                            isGenerating ? "opacity-50" : "opacity-100",
                          )}
                          style={{
                            maxWidth: "100%",
                            height: "auto",
                            aspectRatio: "1",
                          }}
                        />
                      </div>
                    </div>

                    {/* Download Actions */}
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyQrCode}
                        className="gap-2"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQrCode("png")}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PNG
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQrCode("svg")}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        SVG
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>{" "}
          </div>
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
