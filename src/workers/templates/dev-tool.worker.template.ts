// Template for Developer tools (JSON, Base64, Hash, etc.)

interface ConversionMessage {
  type: 'convert';
  input: string;
  options?: {
    operation?: 'encode' | 'decode' | 'format' | 'minify';
    format?: 'json' | 'yaml' | 'csv';
    algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512' | 'MD5';
  };
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
}

interface CompleteMessage {
  type: 'complete';
  result: string;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerMessage = ConversionMessage;
type ResponseMessage = ProgressMessage | CompleteMessage | ErrorMessage;

// Base64 encode/decode
function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

function base64Decode(input: string): string {
  return decodeURIComponent(escape(atob(input)));
}

// URL encode/decode
function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

// Hash generation
async function generateHash(input: string, algorithm: string = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// UUID generation
function generateUUID(): string {
  return crypto.randomUUID();
}

// JSON formatting/minifying
function formatJSON(input: string, minify: boolean = false): string {
  try {
    const parsed = JSON.parse(input);
    return minify 
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error('Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Main processing function
async function processInput(input: string, options?: any): Promise<string> {
  self.postMessage({ type: 'progress', progress: 50 } as ProgressMessage);
  
  let result: string;
  
  switch (options?.operation) {
    case 'encode':
      if (options.format === 'base64') {
        result = base64Encode(input);
      } else if (options.format === 'url') {
        result = urlEncode(input);
      } else {
        throw new Error('Unknown encoding format');
      }
      break;
      
    case 'decode':
      if (options.format === 'base64') {
        result = base64Decode(input);
      } else if (options.format === 'url') {
        result = urlDecode(input);
      } else {
        throw new Error('Unknown decoding format');
      }
      break;
      
    case 'format':
      result = formatJSON(input, false);
      break;
      
    case 'minify':
      result = formatJSON(input, true);
      break;
      
    case 'hash':
      result = await generateHash(input, options.algorithm);
      break;
      
    case 'uuid':
      result = generateUUID();
      break;
      
    default:
      throw new Error('Unknown operation');
  }
  
  self.postMessage({ type: 'progress', progress: 100 } as ProgressMessage);
  
  return result;
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, input, options } = event.data;

  if (type === 'convert') {
    try {
      const result = await processInput(input, options);
      self.postMessage({ type: 'complete', result } as CompleteMessage);
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ErrorMessage);
    }
  }
});

export {};