/**
 * JSON.stringify that won't throw on circular references.
 * Falls back to '[Circular]' on error.
 */
export function safeStringify(value: unknown, space?: number): string {
  try {
    return JSON.stringify(value, null, space)
  } catch {
    return '[Circular]'
  }
}
