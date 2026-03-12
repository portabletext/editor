/**
 * JSON.stringify that won't throw on circular references.
 * Falls back to '[Circular]' on error.
 */
export function safeStringify(value: unknown, space?: number): string {
  try {
    // biome-ignore lint/style/noRestrictedGlobals: This is the one place where JSON.stringify is allowed
    return JSON.stringify(value, null, space)
  } catch {
    return '[Circular]'
  }
}

/**
 * Re-export of JSON.parse.
 * Centralized here so the noRestrictedGlobals rule can ban direct JSON access.
 */
export function safeParse(text: string): unknown {
  // biome-ignore lint/style/noRestrictedGlobals: This is the one place where JSON.parse is allowed
  return JSON.parse(text)
}
