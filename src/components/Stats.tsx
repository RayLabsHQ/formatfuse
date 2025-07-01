import { useEffect, useState } from "react";

export default function Stats() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    const element = document.getElementById("stats-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <section id="stats-section" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center">
            <div
              className="text-4xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              90+
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Conversion Tools
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold"
              style={{ color: "var(--tool-pdf)" }}
            >
              100%
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Privacy Guaranteed
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold"
              style={{ color: "var(--tool-jpg)" }}
            >
              50+
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              File Formats
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold"
              style={{ color: "var(--accent)" }}
            >
              ∞
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Unlimited Usage
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
