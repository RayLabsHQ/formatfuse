import React, { type ReactNode } from "react";
import { ErrorBoundary as LocalErrorBoundary } from "./ErrorBoundary";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Wrap a React island with PostHog context + error boundary.
 * Uses the already-loaded PostHog client (from snippet) to avoid double init.
 *
 * Usage in an island component:
 *   export default function MyIsland() {
 *     return (
 *       <PostHogBoundary>
 *         <ActualContent />
 *       </PostHogBoundary>
 *     )
 *   }
 */
export function PostHogBoundary({ children, fallback }: Props) {
  return <LocalErrorBoundary fallback={fallback ?? null}>{children}</LocalErrorBoundary>;
}
