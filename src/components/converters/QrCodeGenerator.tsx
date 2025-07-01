import React, { useState, useCallback, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Copy,
  Check,
  Palette,
  Settings,
  Wifi,
  User,
  Globe,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Smartphone,
  Package,
  Share2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Info,
  ClipboardPaste,
  FileText,
  Hash,
  Binary,
  Key,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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
    id: "text",
    name: "Text/URL",
    icon: Globe,
    description: "Simple text or URL",
    fields: [
      {
        name: "content",
        label: "Content",
        type: "textarea",
        placeholder: "Enter text or URL...",
        required: true,
      },
    ],
    formatter: (data) => data.content,
  },
  {
    id: "wifi",
    name: "WiFi",
    icon: Wifi,
    description: "WiFi network credentials",
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
    description: "Pre-filled email message",
    fields: [
      {
        name: "to",
        label: "To",
        type: "email",
        placeholder: "recipient@example.com",
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
    description: "Phone number for calling",
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
    icon: Smartphone,
    description: "Pre-filled SMS message",
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
    icon: User,
    description: "Contact information (vCard)",
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
        placeholder: "john@example.com",
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
        placeholder: "https://example.com",
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
    icon: Calendar,
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
    icon: MapPin,
    description: "Geographic coordinates",
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
  const carouselRef = useRef<HTMLDivElement>(null);
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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

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

      // Auto-switch to output tab when QR is generated
      if (dataUrl) {
        setActiveTab("output");
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

  // Scroll carousel
  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 200;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8 md:mb-12 space-y-2 sm:space-y-4 px-4 sm:px-0 pt-4 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold animate-fade-in flex items-center justify-center flex-wrap gap-2 sm:gap-3">
            <span>QR Code</span>
            <span className="text-primary">Generator</span>
          </h1>

          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Create QR codes for URLs, WiFi, contacts, and more with customizable colors and logos
          </p>
        </div>

        {/* Features - Desktop */}
        <div className="hidden sm:block animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="hidden sm:flex flex-wrap justify-center gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.text}</p>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features - Mobile */}
        <div className="sm:hidden space-y-3 mb-8 px-4" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-center gap-4 mb-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    activeFeature === index
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-primary/10 text-primary hover:scale-105"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>
          {activeFeature !== null && (
            <div className="bg-muted/50 rounded-lg p-4 animate-fade-in">
              <p className="font-medium mb-1">{features[activeFeature].text}</p>
              <p className="text-sm text-muted-foreground">
                {features[activeFeature].description}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Tabs */}
        <div className="sm:hidden mb-4 px-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("input")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300",
                activeTab === "input"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 relative",
                activeTab === "output"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <QrCode className="w-4 h-4 inline mr-1" />
              QR Code
              {qrDataUrl && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Settings Card */}
          <Card className={cn(
            "shadow-lg",
            activeTab !== "input" && "hidden sm:block"
          )}>
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                QR Code Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Template Selection */}
              <div className="mb-6">
                <Label className="mb-3 block">QR Code Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {qrTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all hover:scale-105",
                        selectedTemplate.id === template.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <template.icon className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm">{template.name}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Form Fields */}
              <div className="space-y-4">
                {selectedTemplate.fields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name} className="mb-2 block">
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

              {/* Advanced Options */}
              <div className="mt-6">
                <CollapsibleSection title="Advanced Options" defaultOpen={false}>
                  <div className="space-y-4 pt-4">
                    {/* Size and Margin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Size: {style.size}px</Label>
                        <Slider
                          value={[style.size]}
                          onValueChange={([value]) =>
                            setStyle((prev) => ({ ...prev, size: value }))
                          }
                          min={100}
                          max={500}
                          step={10}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Margin: {style.margin}</Label>
                        <Slider
                          value={[style.margin]}
                          onValueChange={([value]) =>
                            setStyle((prev) => ({ ...prev, margin: value }))
                          }
                          min={0}
                          max={10}
                          step={1}
                        />
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dark-color" className="mb-2 block">
                          Foreground Color
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
                            className="w-16 h-10 p-1 cursor-pointer"
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
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="light-color" className="mb-2 block">
                          Background Color
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
                            className="w-16 h-10 p-1 cursor-pointer"
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
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Correction */}
                    <div>
                      <Label className="mb-3 block">Error Correction Level</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                              "py-2 px-3 rounded-md text-sm font-medium transition-colors",
                              style.errorCorrectionLevel === level
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/80",
                            )}
                          >
                            {level} (
                            {level === "L"
                              ? "7%"
                              : level === "M"
                                ? "15%"
                                : level === "Q"
                                  ? "25%"
                                  : "30%"}
                            )
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Higher levels allow more damage but reduce data capacity
                      </p>
                    </div>

                    {/* Logo */}
                    <div>
                      <Label className="mb-2 block">Logo (Optional)</Label>
                      <div className="space-y-3">
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
                          className="cursor-pointer"
                        />
                        {style.logo && (
                          <>
                            <div className="flex items-center gap-4">
                              <img
                                src={style.logo}
                                alt="Logo preview"
                                className="w-12 h-12 rounded object-contain bg-muted"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setStyle((prev) => ({
                                    ...prev,
                                    logo: undefined,
                                    logoSize: undefined,
                                  }))
                                }
                              >
                                Remove Logo
                              </Button>
                            </div>
                            <div>
                              <Label className="mb-2 block">
                                Logo Size: {style.logoSize || 60}px
                              </Label>
                              <Slider
                                value={[style.logoSize || 60]}
                                onValueChange={([value]) =>
                                  setStyle((prev) => ({ ...prev, logoSize: value }))
                                }
                                min={20}
                                max={100}
                                step={5}
                              />
                            </div>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Add your logo to the center of the QR code. Use high error
                          correction (H) for best results.
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <div className={cn(
            "flex-1 flex flex-col",
            activeTab !== "output" && "hidden sm:flex"
          )}>
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Generated QR Code
                  </span>
                  {qrDataUrl && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyQrCode}
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadQrCode("png")}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PNG
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadQrCode("svg")}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        SVG
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-4 sm:p-6">
                {qrDataUrl ? (
                  <div className="p-6 rounded-lg border bg-white dark:bg-muted/30">
                    <canvas
                      ref={canvasRef}
                      className={cn(
                        "transition-opacity",
                        isGenerating ? "opacity-50" : "opacity-100",
                      )}
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Fill in the settings to generate a QR code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
