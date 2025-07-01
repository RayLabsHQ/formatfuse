import React from "react";

interface ResultDisplayProps {
  fileName: string;
  fileUrl: string;
  onDownload: () => void;
  className?: string;
}

export function ResultDisplay({
  fileName,
  fileUrl,
  onDownload,
  className = "",
}: ResultDisplayProps) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg)$/i.test(fileName);

  return (
    <div
      className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${className}`}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {isImage && (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-12 h-12 object-cover rounded"
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </p>
        </div>
      </div>

      <button
        onClick={onDownload}
        className="ml-4 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Download
      </button>
    </div>
  );
}
