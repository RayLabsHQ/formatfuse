import React, { useState, useCallback, useMemo } from "react";
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
  Eye,
  FileJson,
  Code,
  Info,
  Lock,
  Globe,
  Server,
  Package,
  Hash,
  Fingerprint,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

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

export function JwtDecoder() {
  const [jwt, setJwt] = useState("");
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

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
      return;
    }
    const result = decodeJWT(jwt);
    setDecoded(result);
  }, [jwt, decodeJWT]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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
        <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded overflow-x-auto">
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">JWT Decoder</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Decode and inspect JSON Web Tokens without sending them to a server
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="jwt-input"
                  className="text-sm font-medium mb-2 block"
                >
                  Paste JWT Token
                </Label>
                <Textarea
                  id="jwt-input"
                  value={jwt}
                  onChange={(e) => setJwt(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDecode}
                  disabled={!jwt.trim()}
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Decode Token
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJwt("");
                    setDecoded(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>

          {/* Algorithm & Security Info */}
          {decoded && algorithmInfo && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Algorithm
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={algorithmInfo.secure ? "default" : "destructive"}
                    >
                      {decoded.header.alg}
                    </Badge>
                    <span className="text-sm">{algorithmInfo.name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Type
                  </div>
                  <div className="text-sm mt-1">{algorithmInfo.type}</div>
                </div>
                {!algorithmInfo.secure && (
                  <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                      This token uses an insecure algorithm. Do not trust this
                      token for authentication.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Decoded Output Section */}
        <div className="space-y-4">
          {decoded ? (
            decoded.isValid ? (
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="formatted" className="space-y-4">
                  {/* Header Section */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
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
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(decoded.header).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between items-start"
                        >
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            {key}
                          </span>
                          <span className="text-sm font-mono">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Payload Section */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
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
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Expiration Status */}
                    {expirationStatus && (
                      <Alert
                        className={
                          expirationStatus.expired
                            ? "mb-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                            : "mb-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        }
                      >
                        {expirationStatus.expired ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>
                          {expirationStatus.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      {Object.entries(decoded.payload).map(([key, value]) => {
                        const claimInfo = STANDARD_CLAIMS[key];
                        const Icon = claimInfo?.icon || Hash;

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-neutral-500" />
                              <span className="text-sm font-medium">
                                {claimInfo?.name || key}
                              </span>
                              {claimInfo && (
                                <Badge variant="outline" className="text-xs">
                                  Standard
                                </Badge>
                              )}
                            </div>
                            <div className="ml-6 text-sm">
                              {["exp", "nbf", "iat"].includes(key) &&
                              typeof value === "number" ? (
                                <div className="space-y-1">
                                  <div className="font-mono">{value}</div>
                                  <div className="text-neutral-500 dark:text-neutral-400">
                                    {formatDate(value)}
                                  </div>
                                </div>
                              ) : (
                                renderClaimValue(value)
                              )}
                            </div>
                            {claimInfo && (
                              <div className="ml-6 text-xs text-neutral-500 dark:text-neutral-400">
                                {claimInfo.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Signature Section */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Key className="h-4 w-4" />
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
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="font-mono text-xs break-all bg-neutral-100 dark:bg-neutral-800 p-3 rounded">
                      {decoded.signature}
                    </div>
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Note: Signature verification requires the secret key
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="raw" className="space-y-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Raw JSON</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            JSON.stringify(
                              {
                                header: decoded.header,
                                payload: decoded.payload,
                              },
                              null,
                              2,
                            ),
                            "raw",
                          )
                        }
                      >
                        {copiedField === "raw" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 p-4 rounded overflow-x-auto">
                      {JSON.stringify(
                        {
                          header: decoded.header,
                          payload: decoded.payload,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Invalid JWT</AlertTitle>
                <AlertDescription>{decoded.error}</AlertDescription>
              </Alert>
            )
          ) : jwt.trim() ? (
            <Card className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
              <p className="text-neutral-500 dark:text-neutral-400">
                Click "Decode Token" to inspect the JWT
              </p>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
              <p className="text-neutral-500 dark:text-neutral-400">
                Paste a JWT token to decode and inspect its contents
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Info Section */}
      <Card className="mt-6 p-6">
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
            <Info className="h-4 w-4" />
            About JWT (JSON Web Tokens)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
            <p>
              JSON Web Tokens (JWT) are an open standard (RFC 7519) for securely
              transmitting information between parties as a JSON object.
            </p>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Structure
              </h4>
              <p>
                JWTs consist of three parts separated by dots (.):
                Header.Payload.Signature
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Security Note
              </h4>
              <p>
                This tool decodes JWTs client-side without sending them to any
                server. However, JWTs are not encrypted - anyone can decode and
                read their contents. Never store sensitive information in JWT
                payloads.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
