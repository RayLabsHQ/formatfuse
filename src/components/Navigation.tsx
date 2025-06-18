import React from 'react';
import { Search, FileImage, FileText, Code, Sun, Moon, Menu, X } from 'lucide-react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

export default function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

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

  const categories = [
    { name: 'PDF Tools', icon: FileText, color: 'text-tool-pdf', count: 7 },
    { name: 'Image Tools', icon: FileImage, color: 'text-tool-jpg', count: 6 },
    { name: 'Developer Tools', icon: Code, color: 'text-accent', count: 5 },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/[0.95] backdrop-blur-sm border-b">
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
          <NavigationMenu.Root className="hidden md:flex">
            <NavigationMenu.List className="flex space-x-1">
              {categories.map((category) => (
                <NavigationMenu.Item key={category.name}>
                  <NavigationMenu.Trigger className="group px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary ff-transition flex items-center space-x-2">
                    <category.icon className={`w-4 h-4 ${category.color}`} />
                    <span>{category.name}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                      {category.count}
                    </span>
                  </NavigationMenu.Trigger>
                </NavigationMenu.Item>
              ))}
            </NavigationMenu.List>
          </NavigationMenu.Root>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-secondary border-0 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="md:hidden p-2 rounded-md hover:bg-secondary ff-transition"
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
        <div className="md:hidden border-t bg-background">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border-0 rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Mobile Categories */}
            {categories.map((category) => (
              <a
                key={category.name}
                href="#"
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary ff-transition"
              >
                <div className="flex items-center space-x-2">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                  {category.count}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}