const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

const ESCAPE_REGEX = /[&<>"']/g

/**
 * Escape HTML special characters in a string.
 */
export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] || char)
}

const SAFE_PROTOCOLS = ['http', 'https', 'mailto', 'tel']

/**
 * Check if a URI looks safe (not javascript:, data:, etc.)
 */
export function uriLooksSafe(uri: string): boolean {
  const trimmed = uri.trim()
  if (trimmed === '') return false
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
  const protocol = trimmed.split(':')[0]?.toLowerCase()
  return protocol ? SAFE_PROTOCOLS.includes(protocol) : true
}
