import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { parsePageRanges, formatPageRanges } from '../../lib/pdf-operations';
import { Scissors, Download, FileText, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

export const PdfSplit: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range');
  const [pageRangeInput, setPageRangeInput] = useState<string>('');
  const [everyNPages, setEveryNPages] = useState<number>(1);
  const [results, setResults] = useState<Uint8Array[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  
  const { split, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResults([]);
    setPageRangeInput('');
    
    try {
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const count = await getPageCount(fileData);
      const meta = await getMetadata(fileData);
      setPageCount(count);
      setMetadata(meta);
      
      // Set default range to all pages
      setPageRangeInput(`1-${count}`);
    } catch (err) {
      console.error('Error reading PDF:', err);
    }
  }, [getPageCount, getMetadata]);

  const handleSplit = useCallback(async () => {
    if (!file) return;

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      let pageRanges: Array<{ start: number; end: number }> = [];
      
      if (splitMode === 'range') {
        pageRanges = parsePageRanges(pageRangeInput, pageCount);
      } else {
        // Split every N pages
        for (let i = 1; i <= pageCount; i += everyNPages) {
          pageRanges.push({
            start: i,
            end: Math.min(i + everyNPages - 1, pageCount)
          });
        }
      }

      if (pageRanges.length === 0) {
        throw new Error('No valid page ranges specified');
      }

      const splitResults = await split(fileData, { pageRanges });
      setResults(splitResults);
    } catch (err) {
      console.error('Error splitting PDF:', err);
    }
  }, [file, split, splitMode, pageRangeInput, pageCount, everyNPages]);

  const downloadSingle = useCallback((data: Uint8Array, index: number) => {
    const blob = new Blob([data], { type: 'application/pdf' });
    const baseName = file?.name.replace('.pdf', '') || 'split';
    saveAs(blob, `${baseName}_part${index + 1}.pdf`);
  }, [file]);

  const downloadAll = useCallback(async () => {
    if (results.length === 0) return;

    const zip = new JSZip();
    const baseName = file?.name.replace('.pdf', '') || 'split';

    results.forEach((data, index) => {
      zip.file(`${baseName}_part${index + 1}.pdf`, data);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseName}_split.zip`);
  }, [results, file]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Split PDF
        </CardTitle>
        <CardDescription>
          Extract pages or split your PDF into multiple files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="pdf-file">Select PDF file</Label>
          <Input
            id="pdf-file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="mt-1"
          />
        </div>

        {file && pageCount > 0 && (
          <>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{file.name}</span>
              </div>
              <div className="mt-1">
                Total pages: <span className="font-medium">{pageCount}</span>
                {metadata?.title && (
                  <span className="ml-3">Title: {metadata.title}</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Split mode</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="range"
                      checked={splitMode === 'range'}
                      onChange={(e) => setSplitMode(e.target.value as 'range' | 'every')}
                      className="w-4 h-4"
                    />
                    <span>Custom ranges</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="every"
                      checked={splitMode === 'every'}
                      onChange={(e) => setSplitMode(e.target.value as 'range' | 'every')}
                      className="w-4 h-4"
                    />
                    <span>Split every N pages</span>
                  </label>
                </div>
              </div>

              {splitMode === 'range' ? (
                <div>
                  <Label htmlFor="page-ranges">
                    Page ranges (e.g., "1-3, 5, 7-10")
                  </Label>
                  <Input
                    id="page-ranges"
                    type="text"
                    placeholder="1-3, 5, 7-10"
                    value={pageRangeInput}
                    onChange={(e) => setPageRangeInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter page numbers or ranges separated by commas
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="every-n-pages">
                    Split every N pages
                  </Label>
                  <Input
                    id="every-n-pages"
                    type="number"
                    min="1"
                    max={pageCount}
                    value={everyNPages}
                    onChange={(e) => setEveryNPages(parseInt(e.target.value) || 1)}
                    className="mt-1 w-32"
                  />
                </div>
              )}

              <Button
                onClick={handleSplit}
                disabled={isProcessing || !file}
                className="w-full"
              >
                {isProcessing ? 'Splitting...' : 'Split PDF'}
              </Button>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processing... {Math.round(progress)}%
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error.message}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Split Results</h3>
              <Button
                onClick={downloadAll}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All as ZIP
              </Button>
            </div>
            
            <div className="space-y-2">
              {results.map((data, index) => {
                const sizeKB = Math.round(data.length / 1024);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Part {index + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        ({sizeKB} KB)
                      </span>
                    </div>
                    <Button
                      onClick={() => downloadSingle(data, index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfSplit;