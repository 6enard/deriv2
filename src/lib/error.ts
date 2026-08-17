export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const nested = (err as { error?: { message?: unknown } }).error
    if (nested && typeof nested === 'object' && typeof nested.message === 'string' && nested.message) {
      return nested.message
    }
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  if (typeof err === 'string' && err) return err
  return fallback
}
