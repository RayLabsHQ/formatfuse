import React from 'react';
import { ArrowRight, TrendingUp, Sparkles, X } from 'lucide-react';
import { categories, searchTools } from '../data/tools';

export default function AllToolsGrid() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // Filter tools based on search and category
  const filteredTools = React.useMemo(() => {
    let tools = searchQuery ? searchTools(searchQuery) : categories.flatMap(cat => cat.tools);
    
    if (selectedCategory) {
      tools = tools.filter(tool => tool.category === selectedCategory);
    }
    
    return tools;
  }, [searchQuery, selectedCategory]);

  // Group filtered tools by category
  const groupedTools = React.useMemo(() => {
    const groups: Record<string, typeof filteredTools> = {};
    
    filteredTools.forEach(tool => {
      if (!groups[tool.category]) {
        groups[tool.category] = [];
      }
      groups[tool.category].push(tool);
    });
    
    return groups;
  }, [filteredTools]);

  const totalTools = categories.reduce((acc, cat) => acc + cat.tools.length, 0);
  const visibleTools = filteredTools.length;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Search tools (try 'pdf', 'png to jpg', 'compress')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full sm:w-96 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{visibleTools}</span>
              <span>of</span>
              <span className="font-medium">{totalTools}</span>
              <span>tools available</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border hover:border-primary/20 hover:bg-primary/5'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => {
              const count = category.tools.filter(tool => 
                searchQuery ? searchTools(searchQuery).includes(tool) : true
              ).length;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-card border border-border hover:border-primary/20 hover:bg-primary/5'
                  }`}
                >
                  {category.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools by Category */}
        <div className="space-y-12">
          {categories.map((category) => {
            const categoryTools = groupedTools[category.id] || [];
            if (categoryTools.length === 0) return null;
            
            return (
              <div key={category.id}>
                <h2 className="text-2xl font-bold mb-6">{category.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categoryTools.map((tool) => (
                    <a
                      key={tool.id}
                      href={tool.route || `/convert/${tool.id}`}
                      className="group relative block"
                    >
                      <div className="relative h-full bg-card rounded-2xl p-6 border border-border transition-all duration-200 hover:scale-[1.02] hover:border-primary/20 hover:shadow-lg">
                        {/* Color accent bar */}
                        <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${category.bgColor} opacity-60`} />
                        
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.bgColor}`}>
                            <tool.icon className={`w-6 h-6 ${category.color.split(' ')[1]}`} />
                          </div>
                          
                          {/* Badges */}
                          <div className="flex gap-2">
                            {tool.isNew && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                <Sparkles className="w-3 h-3" />
                                New
                              </span>
                            )}
                            {tool.isPopular && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                Hot
                              </span>
                            )}
                            {tool.isBeta && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                Beta
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {tool.description}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Try now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {visibleTools === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">No tools found</p>
              <p className="text-muted-foreground mb-4">Try adjusting your search or browse all categories</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="text-primary hover:underline text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}