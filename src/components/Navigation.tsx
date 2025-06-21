import React from 'react';
import { 
  Search, Sun, Moon, Menu, X, ChevronDown,
  ArrowRight, TrendingUp, Sparkles
} from 'lucide-react';
import { categories, searchTools, pdfTools, imageTools, devTools, allTools } from '../data/tools';
import type { Tool } from '../data/tools';

export default function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const [mobileCategory, setMobileCategory] = React.useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const [dropdownTimeout, setDropdownTimeout] = React.useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

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

  // Get search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery) return [];
    
    const matchedTools = searchTools(searchQuery);
    const results: Array<{tool: Tool, category: typeof categories[0]}> = [];
    
    matchedTools.forEach(tool => {
      const category = categories.find(cat => cat.id === tool.category);
      if (category) {
        results.push({ tool, category });
      }
    });
    
    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery]);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2 group">
              <img 
                src="/logo.svg" 
                alt="FormatFuse" 
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold">Format Fuse</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {categories.map((category) => (
              <div
                key={category.name}
                className="relative"
                onMouseEnter={() => {
                  if (dropdownTimeout) {
                    clearTimeout(dropdownTimeout);
                    setDropdownTimeout(null);
                  }
                  setActiveDropdown(category.name);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setActiveDropdown(null);
                  }, 300); // 300ms delay before closing
                  setDropdownTimeout(timeout);
                }}
              >
                <button 
                  className="group px-4 py-2 text-sm font-medium hover:text-foreground text-muted-foreground ff-transition flex items-center gap-1 h-full"
                  onClick={(e) => {
                    e.preventDefault();
                    if (dropdownTimeout) {
                      clearTimeout(dropdownTimeout);
                      setDropdownTimeout(null);
                    }
                    setActiveDropdown(activeDropdown === category.name ? null : category.name);
                  }}
                >
                  {category.name}
                  <ChevronDown className={`w-3 h-3 ff-transition ${activeDropdown === category.name ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === category.name && (
                  <div className="absolute top-full left-0 mt-1 w-[600px] z-[100] pointer-events-auto">
                    <div className="bg-card rounded-lg shadow-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{category.name}</h3>
                        <a href={`/tools#${category.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          View all
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                      {(category.id === 'image' ? category.tools.slice(0, 6) : category.tools).map((tool) => (
                        <a
                          key={tool.id}
                          href={tool.route || `/convert/${tool.id}`}
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
                              {tool.isPopular && (
                                <TrendingUp className="w-3 h-3 text-primary" />
                              )}
                              {tool.isNew && (
                                <Sparkles className="w-3 h-3 text-accent" />
                              )}
                              {tool.isBeta && (
                                <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded ml-1">
                                  Beta
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                      </div>
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
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="pl-10 pr-4 py-2 w-56 bg-secondary border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-80 bg-card rounded-lg shadow-lg border p-2 z-[100]">
                    <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
                      {searchResults.length} results
                    </div>
                    {searchResults.map(({ tool, category }, index) => (
                      <a
                        key={`${tool.id}-${index}`}
                        href={
                          tool.id === 'image-resizer' ? '/tools/image-resizer' : 
                          tool.id === 'image-compressor' ? '/tools/image-compressor' :
                          tool.id === 'json-formatter' ? '/tools/json-formatter' :
                          tool.id === 'word-counter' ? '/tools/word-counter' :
                          tool.id === 'base64-encoder' ? '/tools/base64-encoder' :
                          tool.id === 'case-converter' ? '/tools/case-converter' :
                          tool.id === 'hash-generator' ? '/tools/hash-generator' :
                          tool.id === 'qr-generator' ? '/tools/qr-generator' :
                          `/convert/${tool.id}`
                        }
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary ff-transition"
                      >
                        <div className={`p-1.5 rounded ${category.bgColor} ${category.color}`}>
                          <tool.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{tool.name}</div>
                          <div className="text-xs text-muted-foreground">{category.name}</div>
                        </div>
                        {tool.isPopular && <TrendingUp className="w-3 h-3 text-primary" />}
                        {tool.isNew && <Sparkles className="w-3 h-3 text-accent" />}
                        {tool.isBeta && (
                          <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded">
                            Beta
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
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

            {/* Mobile Search Results or Categories */}
            {searchQuery && searchResults.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground px-3 py-1">
                  {searchResults.length} results
                </div>
                {searchResults.map(({ tool, category }, index) => (
                  <a
                    key={`${tool.id}-${index}`}
                    href={
                      tool.id === 'image-resizer' ? '/tools/image-resizer' : 
                      tool.id === 'image-compressor' ? '/tools/image-compressor' :
                      tool.id === 'json-formatter' ? '/tools/json-formatter' :
                      tool.id === 'word-counter' ? '/tools/word-counter' :
                      tool.id === 'base64-encoder' ? '/tools/base64-encoder' :
                      tool.id === 'case-converter' ? '/tools/case-converter' :
                      `/convert/${tool.id}`
                    }
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary ff-transition"
                  >
                    <tool.icon className={`w-4 h-4 ${category.color}`} />
                    <div className="flex-1">
                      <span className="text-sm">{tool.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {category.name}
                      </span>
                    </div>
                    {tool.isPopular && (
                      <TrendingUp className="w-3 h-3 text-primary" />
                    )}
                    {tool.isNew && (
                      <Sparkles className="w-3 h-3 text-accent" />
                    )}
                  </a>
                ))}
              </div>
            ) : (
              /* Mobile Categories */
              categories.map((category) => (
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
                      {(category.id === 'image' ? category.tools.slice(0, 6) : category.tools).map((tool) => (
                        <a
                          key={tool.id}
                          href={tool.route || `/convert/${tool.id}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary ff-transition"
                        >
                          <tool.icon className={`w-4 h-4 ${category.color}`} />
                          <span className="text-sm">{tool.name}</span>
                          {tool.isBeta && (
                            <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded ml-1">
                              Beta
                            </span>
                          )}
                          {tool.isPopular && (
                            <TrendingUp className="w-3 h-3 text-primary ml-auto" />
                          )}
                          {tool.isNew && (
                            <Sparkles className="w-3 h-3 text-accent ml-auto" />
                          )}
                        </a>
                      ))}
                      {category.id === 'image' && category.tools.length > 6 && (
                        <a
                          href="/tools#image"
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary ff-transition text-primary text-sm font-medium"
                        >
                          View all {category.tools.length} Image Tools
                          <ArrowRight className="w-4 h-4 ml-auto" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

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