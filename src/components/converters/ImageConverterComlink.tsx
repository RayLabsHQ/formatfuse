import React, { useState } from 'react';
import { useImageConverter } from '../../hooks/useImageConverter';
import { IMAGE_FORMATS } from '../../lib/image-converter-comlink';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Download, Upload, Zap, Shield, FileImage } from 'lucide-react';

/**
 * Example component demonstrating Comlink-based image conversion
 * This shows how much cleaner the code is with Comlink vs postMessage
 */
export default function ImageConverterComlink() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState(IMAGE_FORMATS.JPEG);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  
  const { convert, progress, loading, error } = useImageConverter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setConvertedBlob(null);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    const result = await convert(selectedFile, targetFormat);
    if (result) {
      setConvertedBlob(result);
    }
  };

  const handleDownload = () => {
    if (!convertedBlob || !selectedFile) return;

    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${targetFormat.extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold">Image Converter (Comlink)</h2>
      
      {/* File Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-primary-foreground
            hover:file:bg-primary/90"
          aria-label="Select images to convert"
        />
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Target Format
        </label>
        <select
          value={targetFormat.name}
          onChange={(e) => setTargetFormat(IMAGE_FORMATS[e.target.value])}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          {Object.entries(IMAGE_FORMATS).map(([key, format]) => (
            <option key={key} value={key}>
              {format.name}
            </option>
          ))}
        </select>
      </div>

      {/* Convert Button */}
      <Button
        onClick={handleConvert}
        disabled={!selectedFile || loading}
        className="w-full"
      >
        {loading ? (
          <>Converting... {Math.round(progress)}%</>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Convert Image
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {loading && (
        <Progress value={progress} className="w-full" />
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {/* Download Button */}
      {convertedBlob && (
        <Button
          onClick={handleDownload}
          variant="secondary"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download {targetFormat.name}
        </Button>
      )}

      {/* Comlink Benefits Note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Comlink Benefits:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Clean async/await API instead of postMessage</li>
          <li>Real-time progress updates with simple callbacks</li>
          <li>Full TypeScript support</li>
          <li>Automatic cleanup with releaseProxy</li>
          <li>Only 1.1kB overhead</li>
        </ul>
      </div>

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Zap className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Lightning Fast</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            WebAssembly-powered conversion runs instantly in your browser
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">100% Private</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your images never leave your device - all processing is local
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileImage className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">All Formats</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Convert between JPEG, PNG, WebP, AVIF, GIF, BMP, and more
          </p>
        </div>
      </div>
    </div>
  );
}