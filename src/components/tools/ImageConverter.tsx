import React, { useState, useCallback } from 'react';
import { getImageConverterComlink, IMAGE_FORMATS, type ImageFormat } from '../../lib/image-converter-comlink';
import { FileUploader } from '../core/FileUploader';
import { ProgressBar } from '../core/ProgressBar';
import { ResultDisplay } from '../core/ResultDisplay';

interface ImageConverterProps {
  sourceFormat?: string;
  targetFormat?: string;
}

export function ImageConverter({ sourceFormat, targetFormat }: ImageConverterProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ name: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTargetFormat, setSelectedTargetFormat] = useState<ImageFormat>(
    targetFormat ? IMAGE_FORMATS[targetFormat.toUpperCase()] || IMAGE_FORMATS.PNG : IMAGE_FORMATS.PNG
  );

  const handleFilesSelect = useCallback((selectedFiles: File[]) => {
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

    const converter = getImageConverterComlink();
    const convertedFiles: Array<{ name: string; url: string }> = [];

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

        convertedFiles.push({ name: newName, url });
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

  const handleDownloadAll = useCallback(() => {
    results.forEach(({ url, name }) => {
      handleDownload(url, name);
    });
  }, [results, handleDownload]);

  const acceptedFormats = sourceFormat 
    ? `.${IMAGE_FORMATS[sourceFormat.toUpperCase()]?.extension || '*'}`
    : Object.values(IMAGE_FORMATS).map(f => `.${f.extension}`).join(',');

  return (
    <div className="space-y-6">
      <FileUploader
        onFilesSelect={handleFilesSelect}
        accept={acceptedFormats}
        multiple={true}
        maxSize={50 * 1024 * 1024} // 50MB
      />

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label htmlFor="target-format" className="text-sm font-medium">
              Convert to:
            </label>
            <select
              id="target-format"
              value={selectedTargetFormat.extension}
              onChange={(e) => {
                const format = Object.values(IMAGE_FORMATS).find(
                  f => f.extension === e.target.value
                );
                if (format) setSelectedTargetFormat(format);
              }}
              className="px-3 py-2 border rounded-md"
              disabled={converting}
            >
              {Object.values(IMAGE_FORMATS).map((format) => (
                <option key={format.extension} value={format.extension}>
                  {format.name} (.{format.extension})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConvert}
            disabled={converting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? 'Converting...' : `Convert ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {converting && (
        <ProgressBar progress={progress} />
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Converted Files</h3>
          
          {results.length > 1 && (
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download All
            </button>
          )}

          <div className="space-y-2">
            {results.map((result, index) => (
              <ResultDisplay
                key={index}
                fileName={result.name}
                fileUrl={result.url}
                onDownload={() => handleDownload(result.url, result.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}