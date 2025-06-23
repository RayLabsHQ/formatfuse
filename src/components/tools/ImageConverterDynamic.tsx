import React, { useState, useCallback, useEffect } from 'react';
import { getImageConverter, IMAGE_FORMATS, type ImageFormat } from '../../lib/image-converter';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageConverterDynamicProps {
  sourceFormat?: string;
  targetFormat?: string;
  onFormatChange?: (from: string, to: string) => void;
}

// Extended format list with all supported formats
const ALL_FORMATS: Record<string, ImageFormat & { color: string; emoji: string }> = {
  PNG: { 
    mime: 'image/png', 
    extension: 'png', 
    name: 'PNG',
    color: 'from-pink-500 to-rose-500',
    emoji: '🎨'
  },
  JPEG: { 
    mime: 'image/jpeg', 
    extension: 'jpg', 
    name: 'JPEG/JPG',
    color: 'from-amber-500 to-orange-500',
    emoji: '📸'
  },
  WEBP: { 
    mime: 'image/webp', 
    extension: 'webp', 
    name: 'WebP',
    color: 'from-blue-500 to-indigo-500',
    emoji: '🌐'
  },
  GIF: { 
    mime: 'image/gif', 
    extension: 'gif', 
    name: 'GIF',
    color: 'from-purple-500 to-pink-500',
    emoji: '🎬'
  },
  BMP: { 
    mime: 'image/bmp', 
    extension: 'bmp', 
    name: 'BMP',
    color: 'from-teal-500 to-cyan-500',
    emoji: '🖼️'
  },
  ICO: { 
    mime: 'image/x-icon', 
    extension: 'ico', 
    name: 'ICO',
    color: 'from-indigo-500 to-purple-500',
    emoji: '🪟'
  },
  TIFF: { 
    mime: 'image/tiff', 
    extension: 'tiff', 
    name: 'TIFF',
    color: 'from-green-500 to-emerald-500',
    emoji: '📷'
  },
  AVIF: { 
    mime: 'image/avif', 
    extension: 'avif', 
    name: 'AVIF',
    color: 'from-violet-500 to-purple-500',
    emoji: '🚀'
  },
  SVG: { 
    mime: 'image/svg+xml', 
    extension: 'svg', 
    name: 'SVG',
    color: 'from-yellow-500 to-amber-500',
    emoji: '📐'
  },
  HEIC: { 
    mime: 'image/heic', 
    extension: 'heic', 
    name: 'HEIC',
    color: 'from-gray-500 to-slate-500',
    emoji: '📱'
  }
};

export function ImageConverterDynamic({ 
  sourceFormat, 
  targetFormat,
  onFormatChange 
}: ImageConverterDynamicProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Dynamic format selection
  const [selectedSourceFormat, setSelectedSourceFormat] = useState(
    sourceFormat ? ALL_FORMATS[sourceFormat.toUpperCase()] : ALL_FORMATS.PNG
  );
  const [selectedTargetFormat, setSelectedTargetFormat] = useState(
    targetFormat ? ALL_FORMATS[targetFormat.toUpperCase()] : ALL_FORMATS.JPEG
  );

  // Quality settings for lossy formats
  const [quality, setQuality] = useState(85);
  const showQualitySlider = ['JPEG', 'WEBP', 'AVIF'].includes(selectedTargetFormat.name.split('/')[0]);

  useEffect(() => {
    if (onFormatChange) {
      onFormatChange(selectedSourceFormat.extension, selectedTargetFormat.extension);
    }
  }, [selectedSourceFormat, selectedTargetFormat, onFormatChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelect(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFilesSelect = useCallback((selectedFiles: File[]) => {
    // Auto-detect source format from first file
    if (selectedFiles.length > 0) {
      const firstFile = selectedFiles[0];
      const extension = firstFile.name.split('.').pop()?.toUpperCase();
      
      if (extension && ALL_FORMATS[extension]) {
        setSelectedSourceFormat(ALL_FORMATS[extension]);
      }
    }
    
    setFiles(selectedFiles);
    setError(null);
    setResults([]);
  }, []);

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;

    setConverting(true);
    setProgress(0);
    setError(null);
    setResults([]);

    const converter = getImageConverter();
    const convertedFiles: Array<{ name: string; url: string; size: number }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressPerFile = 100 / files.length;
        const baseProgress = i * progressPerFile;

        const convertedBlob = await converter.convert(
          file,
          selectedTargetFormat,
          (fileProgress) => {
            setProgress(baseProgress + (fileProgress * progressPerFile) / 100);
          }
        );

        const url = URL.createObjectURL(convertedBlob);
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${originalName}.${selectedTargetFormat.extension}`;

        convertedFiles.push({ 
          name: newName, 
          url,
          size: convertedBlob.size 
        });
        
        setProgress((i + 1) * progressPerFile);
      }

      setResults(convertedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
      setProgress(0);
    }
  }, [files, selectedTargetFormat]);

  const handleDownload = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    // Import JSZip dynamically
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    
    for (const result of results) {
      const response = await fetch(result.url);
      const blob = await response.blob();
      zip.file(result.name, blob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    handleDownload(url, 'converted-images.zip');
    URL.revokeObjectURL(url);
  }, [results, handleDownload]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Format Selector */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <select
              value={selectedSourceFormat.extension}
              onChange={(e) => {
                const format = Object.values(ALL_FORMATS).find(
                  f => f.extension === e.target.value
                );
                if (format) setSelectedSourceFormat(format);
              }}
              className={`
                appearance-none px-8 py-4 pr-12 rounded-2xl font-medium text-lg
                bg-gradient-to-r ${selectedSourceFormat.color} text-white
                cursor-pointer transition-all duration-300
                shadow-lg hover:shadow-xl
              `}
            >
              {Object.values(ALL_FORMATS).map((format) => (
                <option key={format.extension} value={format.extension}>
                  {format.emoji} {format.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: converting ? 360 : 0 }}
            transition={{ duration: 2, repeat: converting ? Infinity : 0, ease: "linear" }}
            className="text-3xl"
          >
            →
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <select
              value={selectedTargetFormat.extension}
              onChange={(e) => {
                const format = Object.values(ALL_FORMATS).find(
                  f => f.extension === e.target.value
                );
                if (format) setSelectedTargetFormat(format);
              }}
              className={`
                appearance-none px-8 py-4 pr-12 rounded-2xl font-medium text-lg
                bg-gradient-to-r ${selectedTargetFormat.color} text-white
                cursor-pointer transition-all duration-300
                shadow-lg hover:shadow-xl
              `}
            >
              {Object.values(ALL_FORMATS).map((format) => (
                <option key={format.extension} value={format.extension}>
                  {format.emoji} {format.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Conversion Path */}
        <motion.p 
          className="text-center mt-4 text-gray-600"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          key={`${selectedSourceFormat.extension}-${selectedTargetFormat.extension}`}
        >
          Convert {selectedSourceFormat.name} images to {selectedTargetFormat.name} format
        </motion.p>
      </div>

      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          scale: dragActive ? 1.02 : 1,
          borderColor: dragActive ? 'rgb(99, 102, 241)' : 'rgb(229, 231, 235)'
        }}
        transition={{ duration: 0.2 }}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed p-12
          ${dragActive ? 'bg-indigo-50' : 'bg-gray-50'}
          transition-colors duration-300 cursor-pointer
        `}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={`.${selectedSourceFormat.extension},${selectedSourceFormat.mime}`}
          multiple
          onChange={(e) => handleFilesSelect(Array.from(e.target.files || []))}
          className="hidden"
          aria-label="Select images to convert"
        />

        <div className="text-center">
          <motion.div
            animate={{ 
              y: dragActive ? -10 : 0,
              scale: dragActive ? 1.1 : 1
            }}
            className="mx-auto w-24 h-24 mb-4"
          >
            <div className={`
              w-full h-full rounded-2xl bg-gradient-to-br ${selectedSourceFormat.color}
              flex items-center justify-center text-4xl shadow-lg
            `}>
              {selectedSourceFormat.emoji}
            </div>
          </motion.div>

          <h3 className="text-xl font-semibold mb-2">
            Drop your {selectedSourceFormat.name} files here
          </h3>
          <p className="text-gray-500">
            or click to browse • Max 50MB per file
          </p>

          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-white rounded-xl shadow-sm"
            >
              <p className="font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
              <p className="text-sm text-gray-500">
                Ready to convert to {selectedTargetFormat.name}
              </p>
            </motion.div>
          )}
        </div>

      </motion.div>

      {/* Quality Slider */}
      <AnimatePresence>
        {showQualitySlider && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium">Quality</label>
                <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg">
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert Button */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConvert}
            disabled={converting}
            className={`
              px-8 py-4 rounded-2xl font-medium text-lg text-white
              bg-gradient-to-r ${selectedTargetFormat.color}
              shadow-lg hover:shadow-xl disabled:opacity-50
              transition-all duration-300
              ${converting ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {converting ? (
              <span className="flex items-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⚡
                </motion.span>
                Converting... {Math.round(progress)}%
              </span>
            ) : (
              `Convert to ${selectedTargetFormat.name}`
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Progress Bar */}
      <AnimatePresence>
        {converting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full bg-gradient-to-r ${selectedTargetFormat.color}`}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                ✨ {results.length} file{results.length > 1 ? 's' : ''} converted!
              </h3>
              {results.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  📦 Download All as ZIP
                </button>
              )}
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-lg bg-gradient-to-br ${selectedTargetFormat.color}
                      flex items-center justify-center text-2xl shadow-sm
                    `}>
                      {selectedTargetFormat.emoji}
                    </div>
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(result.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(result.url, result.name)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    ⬇️ Download
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}