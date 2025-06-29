import React, { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 mx-auto max-w-2xl">
          <div className="p-6 rounded-lg border bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  An error occurred while rendering this component. Please refresh the page and try again.
                </p>
                {this.state.error && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:underline">Technical details</summary>
                    <pre className="mt-2 p-2 bg-muted/50 rounded overflow-auto">
                      {this.state.error.message}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}