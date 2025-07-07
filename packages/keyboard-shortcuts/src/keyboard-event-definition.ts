/**
 * @beta
 * A keyboard event definition that can be used to create a keyboard shortcut.
 *
 * At least one of `key` or `code` must be provided while the `alt`, `ctrl`,
 * `meta`, and `shift` modifier configurations are optional.
 *
 * The `key` represents a https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
 * and is treated as case-insensitive.
 *
 * The `code` represents a https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
 * and is treated as case-insensitive.
 *
 * @example
 * ```typescript
 * const boldEvent: KeyboardEventDefinition = {
 *   key: 'B',
 *   alt: false,
 *   ctrl: true,
 *   meta: false,
 *   shift: false,
 * }
 * ```
 */
export type KeyboardEventDefinition = (
  | {key: KeyboardEvent['key']; code: KeyboardEvent['code']}
  | {key: KeyboardEvent['key']; code?: undefined}
  | {key?: undefined; code: KeyboardEvent['code']}
) & {
  alt?: KeyboardEvent['altKey']
  ctrl?: KeyboardEvent['ctrlKey']
  meta?: KeyboardEvent['metaKey']
  shift?: KeyboardEvent['shiftKey']
}
