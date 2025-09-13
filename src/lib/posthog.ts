// Lightweight helper to safely capture exceptions with PostHog when using the snippet.
// Works whether the full SDK has loaded or not.

type AnyRecord = Record<string, any>;

function normalizeError(err: unknown): { name?: string; message?: string; stack?: string } & AnyRecord {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    return { message: String(err) };
  } catch {
    return { message: 'Unknown error' };
  }
}

export function captureError(error: unknown, props: AnyRecord = {}): void {
  if (typeof window === 'undefined') return;
  const ph: any = (window as any).posthog;
  const info = normalizeError(error);

  // Prefer the dedicated API if available (SDK >= 1.207.8)
  if (ph && typeof ph.captureException === 'function') {
    try {
      ph.captureException(error, props);
      return;
    } catch (_) {
      // fall through to generic capture
    }
  }

  // Fallback to generic $exception event if captureException is unavailable
  if (ph && typeof ph.capture === 'function') {
    ph.capture('$exception', {
      $exception_message: info.message,
      $exception_type: info.name,
      $exception_stack_trace: info.stack,
      ...props,
    });
  }
}

