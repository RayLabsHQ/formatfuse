import React from 'react';
import { 
  FileText, FileImage, Code, 
  ArrowRight, TrendingUp, Sparkles,
  Layers, FileDown, Scissors
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  category: 'pdf' | 'image' | 'developer';
  icon: React.ElementType;
  searches: string;
  isNew?: boolean;
  isPopular?: boolean;
}

const tools: Tool[] = [
  // PDF Tools
  { id: 'pdf-to-word', name: 'PDF to Word', category: 'pdf', icon: FileText, searches: '450k', isPopular: true },
  { id: 'pdf-merge', name: 'Merge PDF', category: 'pdf', icon: Layers, searches: '250k' },
  { id: 'pdf-compress', name: 'Compress PDF', category: 'pdf', icon: FileDown, searches: '200k' },
  { id: 'pdf-split', name: 'Split PDF', category: 'pdf', icon: Scissors, searches: '180k' },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', category: 'pdf', icon: FileImage, searches: '300k', isPopular: true },
  
  // Image Tools
  { id: 'png-to-jpg', name: 'PNG to JPG', category: 'image', icon: FileImage, searches: '350k', isPopular: true },
  { id: 'image-resize', name: 'Resize Image', category: 'image', icon: FileImage, searches: '400k', isNew: true },
  { id: 'image-compress', name: 'Compress Image', category: 'image', icon: FileDown, searches: '200k' },
  { id: 'heic-to-jpg', name: 'HEIC to JPG', category: 'image', icon: FileImage, searches: '150k', isNew: true },
  
  // Developer Tools
  { id: 'json-format', name: 'Format JSON', category: 'developer', icon: Code, searches: '150k' },
  { id: 'base64-encode', name: 'Base64 Encode', category: 'developer', icon: Code, searches: '100k' },
];

export default function ToolGrid() {
  const [filter, setFilter] = React.useState<'all' | 'pdf' | 'image' | 'developer'>('all');
  const [hoveredTool, setHoveredTool] = React.useState<string | null>(null);

  const filteredTools = filter === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === filter);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pdf': return 'border-tool-pdf text-tool-pdf';
      case 'image': return 'border-tool-jpg text-tool-jpg';
      case 'developer': return 'border-accent text-accent';
      default: return '';
    }
  };

  return (
    <section id="tools" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Choose your tool, start converting
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            All tools run directly in your browser. No sign-ups, no uploads, no nonsense.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-secondary rounded-lg p-1">
            {['all', 'pdf', 'image', 'developer'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat as any)}
                className={`px-6 py-2 rounded-md text-sm font-medium capitalize ff-transition ${
                  filter === cat 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat === 'all' ? 'All Tools' : `${cat} Tools`}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <a
              key={tool.id}
              href={`/convert/${tool.id}`}
              className={`group relative bg-card rounded-lg p-6 ff-shadow-tool hover:ff-shadow-tool-hover ff-transition border-l-4 ${getCategoryColor(tool.category)}`}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
            >
              {/* Badges */}
              <div className="absolute top-4 right-4 flex gap-2">
                {tool.isNew && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/[0.1] text-accent text-xs font-medium rounded-full">
                    <Sparkles className="w-3 h-3" />
                    New
                  </span>
                )}
                {tool.isPopular && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/[0.1] text-primary text-xs font-medium rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    Popular
                  </span>
                )}
              </div>

              {/* Tool Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary mb-4 ${getCategoryColor(tool.category)}`}>
                <tool.icon className="w-6 h-6" />
              </div>

              {/* Tool Info */}
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary ff-transition">
                {tool.name}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tool.searches}/mo searches
                </span>
                <ArrowRight className={`w-4 h-4 text-muted-foreground ff-transition ${
                  hoveredTool === tool.id ? 'translate-x-1' : ''
                }`} />
              </div>

              {/* Hover Effect Line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 ff-transition" />
            </a>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-12 text-center">
          <a 
            href="/tools" 
            className="inline-flex items-center text-primary font-medium hover:gap-3 gap-2 ff-transition"
          >
            View all 50+ tools
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}