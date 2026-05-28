/**
 * Parse error taxonomy for `@portabletext/markdown` v2.
 *
 * v1 (markdown-it) silently swallowed malformed inputs and emitted best-effort
 * tokens. v2 distinguishes recoverable vs fatal: by default the parser is
 * lenient and treats malformed input as paragraph text; with `strict: true`
 * (future option) it throws `ParseError` with one of these codes.
 *
 * @internal
 */
export const ErrorCode = {
  UnclosedFence: 'UNCLOSED_FENCE',
  UnbalancedEmphasis: 'UNBALANCED_EMPHASIS',
  MalformedLinkTitle: 'MALFORMED_LINK_TITLE',
  InvalidTableDelimiter: 'INVALID_TABLE_DELIMITER',
  UnexpectedCharacter: 'UNEXPECTED_CHARACTER',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export interface SourceLocation {
  line: number
  column: number
}

/**
 * A parse error with a stable code and source location.
 *
 * @internal
 */
export class ParseError extends Error {
  public readonly code: ErrorCode
  public readonly location: SourceLocation

  constructor(code: ErrorCode, location: SourceLocation, details?: string) {
    const message = details
      ? `${code}: ${details} at line ${location.line}, column ${location.column}`
      : `${code} at line ${location.line}, column ${location.column}`
    super(message)
    this.name = 'ParseError'
    this.code = code
    this.location = location
  }
}

export function parseError(
  code: ErrorCode,
  line: number,
  column: number,
  details?: string,
): ParseError {
  return new ParseError(code, {line, column}, details)
}
