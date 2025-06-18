import React from 'react';
import { 
  Search, Sun, Moon, Menu, X, ChevronDown,
  FileText, FileImage, Code, ArrowRight,
  Layers, FileDown, Scissors, Type, Image,
  QrCode, Braces, Hash, TrendingUp, Sparkles
} from 'lucide-react';

// Tool definitions
const pdfTools = [
  { id: 'pdf-to-word', name: 'PDF to Word', icon: FileText, popular: true },
  { id: 'pdf-merge', name: 'Merge PDF', icon: Layers },
  { id: 'pdf-compress', name: 'Compress PDF', icon: FileDown },
  { id: 'pdf-split', name: 'Split PDF', icon: Scissors },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: Image, popular: true },
  { id: 'word-to-pdf', name: 'Word to PDF', icon: Type },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: Image },
];

const imageTools = [
  { id: 'png-to-jpg', name: 'PNG to JPG', icon: Image, popular: true },
  { id: 'image-resize', name: 'Resize Image', icon: Image, new: true },
  { id: 'image-compress', name: 'Compress Image', icon: FileDown },
  { id: 'heic-to-jpg', name: 'HEIC to JPG', icon: Image, new: true },
  { id: 'webp-convert', name: 'WebP Converter', icon: Image },
  { id: 'background-remove', name: 'Remove Background', icon: Image },
];

const devTools = [
  { id: 'json-format', name: 'Format JSON', icon: Braces },
  { id: 'base64-encode', name: 'Base64 Encode/Decode', icon: Hash },
  { id: 'qr-generator', name: 'QR Code Generator', icon: QrCode },
  { id: 'url-shorten', name: 'URL Shortener', icon: ArrowRight },
  { id: 'word-counter', name: 'Word Counter', icon: Type },
];

const categories = [
  { name: 'PDF Tools', tools: pdfTools, color: 'text-tool-pdf', bgColor: 'bg-tool-pdf/[0.1]' },
  { name: 'Image Tools', tools: imageTools, color: 'text-tool-jpg', bgColor: 'bg-tool-jpg/[0.1]' },
  { name: 'Developer Tools', tools: devTools, color: 'text-accent', bgColor: 'bg-accent/[0.1]' },
];

export default function Navigation2() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const [mobileCategory, setMobileCategory] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="w-8 h-8 bg-primary rounded-md ff-transition group-hover:scale-110" />
                <div className="absolute inset-0 w-8 h-8 bg-accent rounded-md -rotate-6 -z-10" />
              </div>
              <span className="text-xl font-bold">FormatFuse</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {categories.map((category) => (
              <div
                key={category.name}
                className="relative"
                onMouseEnter={() => setActiveDropdown(category.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="group px-4 py-2 text-sm font-medium hover:text-foreground text-muted-foreground ff-transition flex items-center gap-1">
                  {category.name}
                  <ChevronDown className={`w-3 h-3 ff-transition ${activeDropdown === category.name ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === category.name && (
                  <div className="absolute top-full left-0 mt-2 w-[600px] bg-card rounded-lg shadow-lg border p-4 z-50">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      <a href="/tools" className="text-xs text-primary hover:underline flex items-center gap-1">
                        View all
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {category.tools.map((tool) => (
                        <a
                          key={tool.id}
                          href={`/convert/${tool.id}`}
                          className="group/item flex items-center gap-3 p-3 rounded-md hover:bg-secondary ff-transition"
                        >
                          <div className={`p-1.5 rounded ${category.bgColor} ${category.color}`}>
                            <tool.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium group-hover/item:text-primary ff-transition">
                                {tool.name}
                              </span>
                              {tool.popular && (
                                <TrendingUp className="w-3 h-3 text-primary" />
                              )}
                              {tool.new && (
                                <Sparkles className="w-3 h-3 text-accent" />
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <a
              href="/tools"
              className="px-4 py-2 text-sm font-medium hover:text-foreground text-muted-foreground ff-transition"
            >
              All Tools
            </a>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-56 bg-secondary border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-secondary ff-transition"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Menu */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-secondary ff-transition"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden border-t bg-background">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Mobile Categories */}
            {categories.map((category) => (
              <div key={category.name} className="space-y-2">
                <button
                  onClick={() => setMobileCategory(
                    mobileCategory === category.name ? null : category.name
                  )}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary ff-transition"
                >
                  <span className="text-sm font-medium">{category.name}</span>
                  <ChevronDown 
                    className={`w-4 h-4 ff-transition ${
                      mobileCategory === category.name ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {mobileCategory === category.name && (
                  <div className="pl-4 space-y-1">
                    {category.tools.map((tool) => (
                      <a
                        key={tool.id}
                        href={`/convert/${tool.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary ff-transition"
                      >
                        <tool.icon className={`w-4 h-4 ${category.color}`} />
                        <span className="text-sm">{tool.name}</span>
                        {tool.popular && (
                          <TrendingUp className="w-3 h-3 text-primary ml-auto" />
                        )}
                        {tool.new && (
                          <Sparkles className="w-3 h-3 text-accent ml-auto" />
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <a
              href="/tools"
              className="block px-3 py-2 rounded-md hover:bg-secondary ff-transition text-sm font-medium"
            >
              View All Tools
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}