/**
 * Public option type for `markdownToPortableTextV2` and `portableTextToMarkdownV2`.
 *
 * Stub for the spike. Will grow with the `nodes` map and matcher hooks once the
 * core round-trip lands.
 *
 * @internal
 */
export interface MarkdownV2Options {
  keyGenerator?: () => string
}
