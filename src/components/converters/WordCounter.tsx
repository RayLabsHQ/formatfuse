import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, Upload, Clock, Hash, Type, AlignLeft, TrendingUp, Settings, Download } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  MobileToolLayout,
  MobileToolHeader,
  MobileToolContent,
  BottomSheet,
  ActionButton,
  ActionIconButton,
  MobileTabs,
  MobileTabsList,
  MobileTabsTrigger,
  MobileTabsContent,
  MobileFileUpload,
  CollapsibleSection
} from '../ui/mobile';
import { cn } from '@/lib/utils';

interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number; // in minutes
  speakingTime: number; // in minutes
  uniqueWords: number;
  averageWordLength: number;
  longestWord: string;
  keywordDensity: Array<{ word: string; count: number; density: number }>;
}

export default function WordCounter() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [text, setText] = useState('');
  const [showKeywords, setShowKeywords] = useState(true);
  const [readingSpeed, setReadingSpeed] = useState(200); // words per minute
  const [speakingSpeed, setSpeakingSpeed] = useState(150); // words per minute
  const [activeTab, setActiveTab] = useState<'editor' | 'stats'>('editor');
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  const stats: TextStats = useMemo(() => {
    if (!text.trim()) {
      return {
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTime: 0,
        speakingTime: 0,
        uniqueWords: 0,
        averageWordLength: 0,
        longestWord: '',
        keywordDensity: []
      };
    }

    // Basic counts
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Words
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Sentences (basic detection)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    
    // Reading and speaking time
    const readingTime = Math.ceil(wordCount / readingSpeed);
    const speakingTime = Math.ceil(wordCount / speakingSpeed);
    
    // Unique words (case-insensitive)
    const wordMap = new Map<string, number>();
    words.forEach(word => {
      const cleaned = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleaned) {
        wordMap.set(cleaned, (wordMap.get(cleaned) || 0) + 1);
      }
    });
    
    const uniqueWords = wordMap.size;
    
    // Average word length
    const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
    const averageWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;
    
    // Longest word
    const longestWord = words.reduce((longest, word) => 
      word.length > longest.length ? word : longest, ''
    );
    
    // Keyword density (top 10 words, excluding common words)
    const commonWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work'
    ]);
    
    const keywordDensity = Array.from(wordMap.entries())
      .filter(([word]) => word.length > 2 && !commonWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: (count / wordCount) * 100
      }));
    
    return {
      words: wordCount,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime,
      speakingTime,
      uniqueWords,
      averageWordLength,
      longestWord,
      keywordDensity
    };
  }, [text, readingSpeed, speakingSpeed]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }, []);

  const handleExport = useCallback(() => {
    const report = `Text Analysis Report
=====================================
Generated: ${new Date().toLocaleString()}

Basic Statistics:
- Words: ${stats.words}
- Characters: ${stats.characters}
- Characters (no spaces): ${stats.charactersNoSpaces}
- Sentences: ${stats.sentences}
- Paragraphs: ${stats.paragraphs}

Reading Metrics:
- Reading time: ${stats.readingTime} minutes (at ${readingSpeed} wpm)
- Speaking time: ${stats.speakingTime} minutes (at ${speakingSpeed} wpm)

Word Analysis:
- Unique words: ${stats.uniqueWords}
- Average word length: ${stats.averageWordLength.toFixed(1)} characters
- Longest word: ${stats.longestWord}

Top Keywords:
${stats.keywordDensity.map((kw, i) => 
  `${i + 1}. "${kw.word}" - ${kw.count} times (${kw.density.toFixed(1)}%)`
).join('\n')}

=====================================
Original Text:
${text}`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-analysis-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [stats, text, readingSpeed, speakingSpeed]);

  // Mobile layout
  if (isMobile) {
    return (
      <MobileToolLayout>
        <MobileToolHeader
          title="Word Counter"
          description="Analyze text statistics"
          action={
            <ActionIconButton
              onClick={() => setShowSettingsSheet(true)}
              icon={<Settings />}
              label="Settings"
              variant="ghost"
            />
          }
        />

        <MobileTabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'stats')} defaultValue="editor">
          <div className="px-4 pt-2">
            <MobileTabsList variant="default">
              <MobileTabsTrigger value="editor">Editor</MobileTabsTrigger>
              <MobileTabsTrigger value="stats" badge={stats.words > 0 ? stats.words.toString() : undefined}>
                Statistics
              </MobileTabsTrigger>
            </MobileTabsList>
          </div>

          <MobileTabsContent value="editor">
            <MobileToolContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="mobile-file-upload"
                    aria-label="Select text files"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <label htmlFor="mobile-file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Text
                    </label>
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={stats.words === 0}
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type or paste your text here..."
                  className="min-h-[400px] resize-none"
                  spellCheck={false}
                />
                
                {/* Quick stats bar */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg text-center">
                  <div>
                    <p className="text-2xl font-bold">{stats.words}</p>
                    <p className="text-xs text-muted-foreground">Words</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.characters}</p>
                    <p className="text-xs text-muted-foreground">Characters</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.sentences}</p>
                    <p className="text-xs text-muted-foreground">Sentences</p>
                  </div>
                </div>
              </div>
            </MobileToolContent>
          </MobileTabsContent>

          <MobileTabsContent value="stats">
            <MobileToolContent>
              <div className="space-y-4">
                {/* Basic Statistics */}
                <CollapsibleSection title="Basic Statistics" defaultOpen={true}>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Words</span>
                      <span className="font-medium">{stats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Characters</span>
                      <span className="font-medium">{stats.characters.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Characters (no spaces)</span>
                      <span className="font-medium">{stats.charactersNoSpaces.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sentences</span>
                      <span className="font-medium">{stats.sentences}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paragraphs</span>
                      <span className="font-medium">{stats.paragraphs}</span>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Time Estimates */}
                <CollapsibleSection title="Time Estimates" defaultOpen={true}>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reading time</span>
                      <span className="font-medium">
                        {stats.readingTime === 0 ? '0' : stats.readingTime < 1 ? '< 1' : stats.readingTime} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speaking time</span>
                      <span className="font-medium">
                        {stats.speakingTime === 0 ? '0' : stats.speakingTime < 1 ? '< 1' : stats.speakingTime} min
                      </span>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Word Analysis */}
                <CollapsibleSection title="Word Analysis" defaultOpen={true}>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unique words</span>
                      <span className="font-medium">{stats.uniqueWords}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average length</span>
                      <span className="font-medium">{stats.averageWordLength.toFixed(1)} chars</span>
                    </div>
                    {stats.longestWord && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Longest word</span>
                        <span className="font-medium text-right break-all">
                          {stats.longestWord}
                        </span>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Top Keywords */}
                {stats.keywordDensity.length > 0 && (
                  <CollapsibleSection title="Top Keywords" defaultOpen={false}>
                    <div className="space-y-2">
                      {stats.keywordDensity.map((kw, index) => (
                        <div key={kw.word} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                          <span className="text-sm">
                            <span className="font-medium">{index + 1}.</span> {kw.word}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {kw.count}× ({kw.density.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            </MobileToolContent>
          </MobileTabsContent>
        </MobileTabs>

        {/* Settings bottom sheet */}
        <BottomSheet
          open={showSettingsSheet}
          onOpenChange={setShowSettingsSheet}
          title="Reading Settings"
        >
          <div className="space-y-6">
            <div>
              <Label htmlFor="mobile-reading-speed" className="mb-2 block">
                Reading Speed: {readingSpeed} wpm
              </Label>
              <Input
                id="mobile-reading-speed"
                type="range"
                value={readingSpeed}
                onChange={(e) => setReadingSpeed(Number(e.target.value))}
                min="100"
                max="500"
                step="10"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>100</span>
                <span>Average: 200-250</span>
                <span>500</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="mobile-speaking-speed" className="mb-2 block">
                Speaking Speed: {speakingSpeed} wpm
              </Label>
              <Input
                id="mobile-speaking-speed"
                type="range"
                value={speakingSpeed}
                onChange={(e) => setSpeakingSpeed(Number(e.target.value))}
                min="100"
                max="300"
                step="10"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>100</span>
                <span>Average: 130-160</span>
                <span>300</span>
              </div>
            </div>
          </div>
        </BottomSheet>
      </MobileToolLayout>
    );
  }

  // Desktop layout
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Word Counter</h1>
        <p className="text-muted-foreground">
          Count words, characters, and analyze text with reading time estimates
        </p>
      </div>

      {/* Settings Bar */}
      <div className="mb-4 p-4 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label>Reading Speed:</Label>
            <Input
              type="number"
              value={readingSpeed}
              onChange={(e) => setReadingSpeed(Number(e.target.value))}
              className="w-20 h-8"
              min="100"
              max="500"
            />
            <span className="text-sm text-muted-foreground">wpm</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Label>Speaking Speed:</Label>
            <Input
              type="number"
              value={speakingSpeed}
              onChange={(e) => setSpeakingSpeed(Number(e.target.value))}
              className="w-20 h-8"
              min="100"
              max="300"
            />
            <span className="text-sm text-muted-foreground">wpm</span>
          </div>

          <div className="ml-auto flex gap-2">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              aria-label="Select text files"
            />
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Upload Text
              </label>
            </Button>
            <Button
              onClick={handleExport}
              disabled={stats.words === 0}
              size="sm"
            >
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Text Input */}
        <div className="lg:col-span-2 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            className="min-h-[500px] resize-none"
            spellCheck={false}
          />
        </div>

        {/* Statistics Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Basic Statistics
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Words:</span>
                <span className="font-medium">{stats.words.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Characters:</span>
                <span className="font-medium">{stats.characters.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Characters (no spaces):</span>
                <span className="font-medium">{stats.charactersNoSpaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sentences:</span>
                <span className="font-medium">{stats.sentences}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paragraphs:</span>
                <span className="font-medium">{stats.paragraphs}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Estimates
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reading time:</span>
                <span className="font-medium">
                  {stats.readingTime === 0 ? '0' : stats.readingTime < 1 ? '< 1' : stats.readingTime} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speaking time:</span>
                <span className="font-medium">
                  {stats.speakingTime === 0 ? '0' : stats.speakingTime < 1 ? '< 1' : stats.speakingTime} min
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Word Analysis
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique words:</span>
                <span className="font-medium">{stats.uniqueWords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average length:</span>
                <span className="font-medium">{stats.averageWordLength.toFixed(1)} chars</span>
              </div>
              {stats.longestWord && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Longest word:</span>
                  <span className="font-medium text-right break-all">
                    {stats.longestWord}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyword Density */}
      {stats.words > 0 && (
        <div className="mt-6 p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Keywords
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeywords(!showKeywords)}
            >
              {showKeywords ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showKeywords && stats.keywordDensity.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.keywordDensity.map((kw, index) => (
                <div key={kw.word} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                  <span className="text-sm">
                    <span className="font-medium">{index + 1}.</span> {kw.word}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {kw.count}× ({kw.density.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Comprehensive Analysis</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Get detailed statistics including unique words and keyword density
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Time Estimates</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Calculate reading and speaking time with adjustable speeds
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <AlignLeft className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Export Reports</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Download detailed analysis reports for your records
          </p>
        </div>
      </div>
    </div>
  );
}