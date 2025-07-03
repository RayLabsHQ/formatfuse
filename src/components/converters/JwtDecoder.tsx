import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Key,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  FileJson,
  Info,
  Lock,
  Globe,
  Server,
  Package,
  Hash,
  Fingerprint,
  Zap,
  Settings,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { CodeEditor } from "../ui/code-editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";

interface JWTHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  [key: string]: any;
}

interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: any;
}

interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  isValid: boolean;
  error?: string;
}

interface ClaimInfo {
  name: string;
  description: string;
  icon: React.ElementType;
  type: "standard" | "custom";
}

const STANDARD_CLAIMS: Record<string, ClaimInfo> = {
  iss: {
    name: "Issuer",
    description: "Token issuer",
    icon: Server,
    type: "standard",
  },
  sub: {
    name: "Subject",
    description: "Token subject (user)",
    icon: User,
    type: "standard",
  },
  aud: {
    name: "Audience",
    description: "Intended audience",
    icon: Globe,
    type: "standard",
  },
  exp: {
    name: "Expiration",
    description: "Token expiration time",
    icon: Clock,
    type: "standard",
  },
  nbf: {
    name: "Not Before",
    description: "Token not valid before",
    icon: Calendar,
    type: "standard",
  },
  iat: {
    name: "Issued At",
    description: "Token issue time",
    icon: Calendar,
    type: "standard",
  },
  jti: {
    name: "JWT ID",
    description: "Unique token identifier",
    icon: Fingerprint,
    type: "standard",
  },
};

const ALGORITHMS: Record<
  string,
  { name: string; type: string; secure: boolean }
> = {
  HS256: { name: "HMAC SHA-256", type: "Symmetric", secure: true },
  HS384: { name: "HMAC SHA-384", type: "Symmetric", secure: true },
  HS512: { name: "HMAC SHA-512", type: "Symmetric", secure: true },
  RS256: { name: "RSA SHA-256", type: "Asymmetric", secure: true },
  RS384: { name: "RSA SHA-384", type: "Asymmetric", secure: true },
  RS512: { name: "RSA SHA-512", type: "Asymmetric", secure: true },
  ES256: { name: "ECDSA P-256 SHA-256", type: "Asymmetric", secure: true },
  ES384: { name: "ECDSA P-384 SHA-384", type: "Asymmetric", secure: true },
  ES512: { name: "ECDSA P-521 SHA-512", type: "Asymmetric", secure: true },
  PS256: { name: "RSA-PSS SHA-256", type: "Asymmetric", secure: true },
  PS384: { name: "RSA-PSS SHA-384", type: "Asymmetric", secure: true },
  PS512: { name: "RSA-PSS SHA-512", type: "Asymmetric", secure: true },
  none: { name: "No signature", type: "None", secure: false },
};

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Decode tokens locally",
  },
  {
    icon: Zap,
    text: "Instant decode",
    description: "Real-time JWT parsing",
  },
  {
    icon: Lock,
    text: "Security analysis",
    description: "Algorithm & expiry check",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: FileJson,
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: FileJson,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA hashes",
    icon: Key,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a JWT (JSON Web Token)?",
    answer:
      "JWT is an open standard (RFC 7519) for securely transmitting information between parties as a JSON object. It consists of three parts: Header (algorithm & token type), Payload (claims), and Signature (verification). JWTs are commonly used for authentication and information exchange.",
  },
  {
    question: "Is it safe to decode JWTs here?",
    answer:
      "Yes! All decoding happens entirely in your browser. No JWT data is sent to any server. However, remember that JWTs are not encrypted - they're just base64 encoded. Anyone can decode them, so never store sensitive information in JWT payloads.",
  },
  {
    question: "What do the different parts mean?",
    answer:
      "Header: Contains the token type (JWT) and signing algorithm. Payload: Contains claims (statements about the user and additional metadata). Signature: Used to verify the token hasn't been tampered with. The signature requires the secret key to verify.",
  },
  {
    question: "How can I verify the signature?",
    answer:
      "Signature verification requires the secret key (for HMAC algorithms) or public key (for RSA/ECDSA algorithms) that was used to sign the token. This tool only decodes JWTs - it cannot verify signatures without the appropriate keys.",
  },
];

// Sample JWT for demo purposes
const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTUxNjIzOTAyMn0.4Adcj3UFYzPUVaVF43FmMab3EguRlv9zZJPjSyVHG4I";

export function JwtDecoder() {
  const [jwt, setJwt] = useState(SAMPLE_JWT);
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [theme, setTheme] = useState("github-dark");

  // Theme detection for CodeEditor
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "github-dark" : "github-light");
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const decodeJWT = useCallback((token: string): DecodedJWT | null => {
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) {
        return {
          header: {},
          payload: {},
          signature: "",
          isValid: false,
          error: "Invalid JWT format. Expected 3 parts separated by dots.",
        };
      }

      // Decode header
      const header = JSON.parse(
        atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")),
      );

      // Decode payload
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );

      // Signature (not decoded, just stored)
      const signature = parts[2];

      return {
        header,
        payload,
        signature,
        isValid: true,
      };
    } catch (error) {
      return {
        header: {},
        payload: {},
        signature: "",
        isValid: false,
        error: error instanceof Error ? error.message : "Failed to decode JWT",
      };
    }
  }, []);

  const handleDecode = useCallback(() => {
    if (!jwt.trim()) {
      setDecoded(null);
      toast.error("Please enter a JWT token");
      return;
    }
    const result = decodeJWT(jwt);
    setDecoded(result);
    if (result?.isValid) {
      setActiveTab("output");
      toast.success("JWT decoded successfully");
    } else {
      toast.error(result?.error || "Invalid JWT");
    }
  }, [jwt, decodeJWT]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJwt(text);
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleClear = useCallback(() => {
    setJwt("");
    setDecoded(null);
    toast.success("Cleared input");
  }, []);

  const formatDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }, []);

  const checkExpiration = useCallback(
    (exp?: number): { expired: boolean; message: string } => {
      if (!exp) return { expired: false, message: "No expiration" };
      const now = Math.floor(Date.now() / 1000);
      const expired = exp < now;
      const diff = Math.abs(exp - now);

      if (expired) {
        return {
          expired: true,
          message: `Expired ${formatRelativeTime(diff)} ago`,
        };
      } else {
        return {
          expired: false,
          message: `Expires in ${formatRelativeTime(diff)}`,
        };
      }
    },
    [],
  );

  const formatRelativeTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  const renderClaimValue = (value: any): React.ReactNode => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    }
    if (typeof value === "object" && value !== null) {
      return (
        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return String(value);
  };

  const algorithmInfo = useMemo(() => {
    if (!decoded?.header?.alg) return null;
    return ALGORITHMS[decoded.header.alg] || null;
  }, [decoded]);

  const expirationStatus = useMemo(() => {
    if (!decoded?.payload?.exp) return null;
    return checkExpiration(decoded.payload.exp);
  }, [decoded, checkExpiration]);

  // Auto-decode on load if sample JWT
  useEffect(() => {
    if (jwt === SAMPLE_JWT) {
      handleDecode();
    }
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Authentication-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-1/4 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/2 left-1/3 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "JWT", main: "Decoder" }}
          subtitle="Free online JWT decoder and validator - Decode JSON Web Tokens locally"
          badge={{ text: "Authentication Tool", icon: Key }}
          features={features}
        />

        {/* Mobile Tabs */}
        <div className="sm:hidden mb-4 px-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("input")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300",
                activeTab === "input"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Input
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 relative",
                activeTab === "output"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileJson className="w-4 h-4 inline mr-1" />
              Decoded
              {decoded?.isValid && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col sm:grid sm:grid-cols-[1fr,1fr] gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Input Panel */}
          <div
            className={cn(
              "flex flex-col min-h-0",
              activeTab !== "input" && "hidden sm:flex",
            )}
          >
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  JWT Token Input
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-4">
                    <Label
                      htmlFor="jwt-input"
                      className="text-sm font-medium mb-2 block"
                    >
                      Paste JWT Token
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={handlePaste}>
                        <ClipboardPaste className="w-4 h-4 mr-2" />
                        Paste
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClear}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      value={jwt}
                      onChange={(value) => setJwt(value || "")}
                      language="text"
                      theme={theme}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="h-full"
                      options={{
                        minimap: { enabled: false },
                        lineNumbers: "off",
                        folding: false,
                        wordWrap: "on",
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={handleDecode}
                      disabled={!jwt.trim()}
                      className="w-full"
                      size="lg"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Decode Token
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div
            className={cn(
              "flex flex-col min-h-0",
              activeTab !== "output" && "hidden sm:flex",
            )}
          >
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-primary" />
                  Decoded Output
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
                {decoded ? (
                  decoded.isValid ? (
                    <div className="space-y-4">
                      {/* Expiration Status */}
                      {expirationStatus && (
                        <div
                          className={cn(
                            "p-3 rounded-lg flex items-center gap-2",
                            expirationStatus.expired
                              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                              : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
                          )}
                        >
                          {expirationStatus.expired ? (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                          <span
                            className={cn(
                              "text-sm font-medium",
                              expirationStatus.expired
                                ? "text-red-700 dark:text-red-300"
                                : "text-green-700 dark:text-green-300",
                            )}
                          >
                            {expirationStatus.message}
                          </span>
                        </div>
                      )}

                      {/* Algorithm & Security Info */}
                      {algorithmInfo && (
                        <div className="p-4 rounded-lg bg-muted/30 border border-muted-foreground/10">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Lock className="w-4 w-4" />
                            Security Information
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Algorithm
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    algorithmInfo.secure
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {decoded.header.alg}
                                </Badge>
                                <span className="text-sm">
                                  {algorithmInfo.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Type
                              </span>
                              <span className="text-sm">
                                {algorithmInfo.type}
                              </span>
                            </div>
                            {!algorithmInfo.secure && (
                              <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                      Security Warning
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                      This token uses an insecure algorithm. Do
                                      not trust this token for authentication.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Header Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Header
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopy(
                                JSON.stringify(decoded.header, null, 2),
                                "header",
                              )
                            }
                          >
                            {copiedField === "header" ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(decoded.header, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Payload Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <FileJson className="w-4 h-4" />
                            Payload
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopy(
                                JSON.stringify(decoded.payload, null, 2),
                                "payload",
                              )
                            }
                          >
                            {copiedField === "payload" ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(decoded.payload).map(
                            ([key, value]) => {
                              const claimInfo = STANDARD_CLAIMS[key];
                              const Icon = claimInfo?.icon || Hash;

                              return (
                                <div
                                  key={key}
                                  className="bg-muted/30 rounded-lg p-3"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {claimInfo?.name || key}
                                      </span>
                                      {claimInfo && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Standard
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-6">
                                    {["exp", "nbf", "iat"].includes(key) &&
                                    typeof value === "number" ? (
                                      <div className="space-y-1">
                                        <div className="font-mono text-sm">
                                          {value}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatDate(value)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm">
                                        {renderClaimValue(value)}
                                      </div>
                                    )}
                                  </div>
                                  {claimInfo && (
                                    <div className="ml-6 text-xs text-muted-foreground mt-1">
                                      {claimInfo.description}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Signature
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopy(decoded.signature, "signature")
                            }
                          >
                            {copiedField === "signature" ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="font-mono text-xs break-all">
                            {decoded.signature}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: Signature verification requires the secret key
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                          Invalid JWT
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {decoded.error}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Enter a JWT token and click "Decode Token"
                      </p>
                    </div>
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
