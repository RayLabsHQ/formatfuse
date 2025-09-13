import React, { type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider, PostHogErrorBoundary } from "posthog-js/react";

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
  return (
    <PostHogProvider client={posthog as any}>
      <PostHogErrorBoundary fallback={fallback ?? null}>{children}</PostHogErrorBoundary>
    </PostHogProvider>
  );
}

