/**
 * JSON.stringify that won't throw on errors.
 */
export function safeStringify(value: unknown, space?: number): string {
  try {
    // biome-ignore lint/style/noRestrictedGlobals: This is the one place where JSON.stringify is allowed
    return JSON.stringify(value, null, space)
  } catch (error) {
    console.error(error)
    return 'JSON.stringify failed'
  }
}

/**
 * JSON.parse that won't throw on errors.
 */
export function safeParse(text: string): unknown {
  try {
    // biome-ignore lint/style/noRestrictedGlobals: This is the one place where JSON.parse is allowed
    return JSON.parse(text)
  } catch (error) {
    console.error(error)
    return 'JSON.parse failed'
  }
}
