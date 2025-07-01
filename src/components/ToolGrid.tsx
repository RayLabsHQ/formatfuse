import React, { useState, useEffect } from "react";
import { FileText, Image, Code, Archive, Wrench } from "lucide-react";
import { allTools as tools } from "../data/tools";

const categories = [
  { id: "pdf", name: "PDF Tools", icon: FileText, color: "var(--tool-pdf)" },
  { id: "image", name: "Image Tools", icon: Image, color: "var(--tool-jpg)" },
  { id: "document", name: "Documents", icon: Code, color: "var(--tool-doc)" },
  { id: "archive", name: "Archives", icon: Archive, color: "var(--primary)" },
  { id: "dev", name: "Developer", icon: Wrench, color: "var(--accent)" },
];

export default function ToolGridNew() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredPopularTool, setHoveredPopularTool] = useState<string | null>(
    null,
  );
  const [hoveredGridTool, setHoveredGridTool] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fallback for mobile: Check if element is already in viewport on mount
    const checkInitialVisibility = () => {
      const element = document.getElementById("all-tools");
      if (element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        // Check if element is already visible
        if (rect.top < windowHeight && rect.bottom > 0) {
          setIsVisible(true);
        }
      }
    };

    // Check immediately
    checkInitialVisibility();

    // Set up Intersection Observer for scroll-triggered animation
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { 
        threshold: 0.01, // Lower threshold for better mobile detection
        rootMargin: '50px' // Trigger animation 50px before element enters viewport
      },
    );

    const element = document.getElementById("all-tools");
    if (element) {
      observer.observe(element);
    }

    // Also check on scroll for mobile browsers that might not support IO well
    const handleScroll = () => {
      if (!isVisible) {
        checkInitialVisibility();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isVisible]);

  const filteredTools = selectedCategory
    ? tools.filter((tool) => tool.category === selectedCategory)
    : tools;

  const popularTools = tools
    .filter((tool) => tool.popular || tool.isPopular)
    .slice(0, 6);

  return (
    <section id="all-tools" className="relative py-20 overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/3 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--gradient-1), transparent)`,
          }}
        />
        <div
          className="absolute bottom-1/3 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--gradient-2), transparent)`,
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-16 space-y-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-bold">
            <span className="text-foreground">Our </span>
            <span style={{ color: "var(--primary)" }}>Tools Collection</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional-grade file conversion tools that work instantly in your
            browser. No uploads, no limits, completely free.
          </p>
        </div>

        {/* Category filters */}
        <div
          className={`flex flex-wrap justify-center gap-3 mb-12 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-3 rounded-xl transition-all duration-300 ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80"
            }`}
          >
            All Tools
          </button>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? "text-white"
                    : "bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80"
                }`}
                style={{
                  backgroundColor:
                    selectedCategory === category.id
                      ? category.color
                      : undefined,
                }}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Popular tools highlight */}
        {!selectedCategory && (
          <div
            className={`mb-16 transition-all duration-700 delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <h3 className="text-2xl font-bold mb-8 text-center">
              <span className="text-muted-foreground">Most Used </span>
              <span style={{ color: "var(--primary)" }}>This Week</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularTools.map((tool, index) => {
                const Icon = tool.icon;
                const category = categories.find((c) => c.id === tool.category);
                const isHovered = hoveredPopularTool === tool.id;

                return (
                  <a
                    key={tool.id}
                    href={tool.href || tool.route || `/convert/${tool.id}`}
                    className="group"
                    onMouseEnter={() => setHoveredPopularTool(tool.id)}
                    onMouseLeave={() => setHoveredPopularTool(null)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className={`relative h-full p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-300 ${
                        isHovered
                          ? "transform -translate-y-1 shadow-lg border-primary/50"
                          : ""
                      }`}
                    >
                      {/* Gradient overlay on hover */}
                      <div
                        className={`absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 ${
                          isHovered ? "opacity-100" : ""
                        }`}
                        style={{
                          background: `radial-gradient(circle at top left, ${category?.color}10, transparent)`,
                        }}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300"
                            style={{
                              backgroundColor: `${category?.color}20`,
                              transform: isHovered
                                ? "scale(1.1) rotate(3deg)"
                                : "scale(1) rotate(0deg)",
                            }}
                          >
                            <Icon
                              className="w-6 h-6"
                              style={{ color: category?.color }}
                            />
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                            Popular
                          </span>
                        </div>

                        <h4 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                          {tool.title || tool.name}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* All tools grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {filteredTools.map((tool, index) => {
            const Icon = tool.icon;
            const category = categories.find((c) => c.id === tool.category);
            const isHovered = hoveredGridTool === tool.id;

            return (
              <a
                key={tool.id}
                href={tool.href || tool.route || `/convert/${tool.id}`}
                className="group"
                onMouseEnter={() => setHoveredGridTool(tool.id)}
                onMouseLeave={() => setHoveredGridTool(null)}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={`relative h-full p-5 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 transition-all duration-300 ${
                    isHovered
                      ? "transform -translate-y-1 shadow-md border-primary/30 bg-card/50"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300"
                        style={{
                          backgroundColor: `${category?.color}15`,
                          transform: isHovered ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: category?.color }}
                        />
                      </div>
                      <h4 className="font-medium group-hover:text-primary transition-colors">
                        {tool.title || tool.name}
                      </h4>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.description}
                    </p>

                    {/* Hover indicator */}
                    <div
                      className={`absolute -right-2 -top-2 w-2 h-2 rounded-full transition-all duration-300 ${
                        isHovered
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-0"
                      }`}
                      style={{ backgroundColor: category?.color }}
                    />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
