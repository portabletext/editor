import type {
  AutoCompleteMatch,
  TypeaheadDismissActionSet,
  TypeaheadPickerDefinition,
  TypeaheadSelectActionSet,
  TypeaheadTriggerGuard,
} from './typeahead-picker.types'

type BaseConfigWithoutDelimiter<TMatch extends object> = {
  /**
   * Pattern that activates the picker. Must be a single character.
   * Can include `^` for start-of-block triggers.
   *
   * @example `/:/` - activates on colon
   * @example `/@/` - activates on at-sign
   * @example `/^\//` - activates on slash at start of block
   */
  trigger: RegExp
  /**
   * Pattern matching the keyword portion after the trigger.
   * The entire match becomes the keyword passed to `getMatches`.
   * Common patterns: non-whitespace (`\S*`) or word characters (`\w*`).
   */
  keyword: RegExp
  delimiter?: undefined
  /**
   * Guard function that runs at trigger time to conditionally prevent activation.
   * Return `false` to block activation, or `true` to allow it.
   */
  guard?: TypeaheadTriggerGuard
  /**
   * Called when a match is selected.
   * Returns behavior actions to execute (e.g., delete trigger text, insert content).
   */
  onSelect: TypeaheadSelectActionSet<TMatch>[]
  /**
   * Called when the picker is dismissed.
   * Returns behavior actions to execute (optional cleanup).
   */
  onDismiss?: TypeaheadDismissActionSet[]
}

type BaseConfigWithDelimiter<TMatch extends AutoCompleteMatch> = {
  /**
   * Pattern that activates the picker. Must be a single character.
   * Can include `^` for start-of-block triggers.
   *
   * @example `/:/` - activates on colon
   * @example `/@/` - activates on at-sign
   * @example `/^\//` - activates on slash at start of block
   */
  trigger: RegExp
  /**
   * Pattern matching the keyword portion after the trigger.
   * The entire match becomes the keyword passed to `getMatches`.
   * Common patterns: non-whitespace (`\S*`) or word characters (`\w*`).
   */
  keyword: RegExp
  /**
   * Character that triggers auto-completion.
   * Typing this after a keyword with an exact match auto-inserts it.
   *
   * @example `':'` - typing `:joy:` auto-inserts the joy emoji
   */
  delimiter: string
  /**
   * Guard function that runs at trigger time to conditionally prevent activation.
   * Return `false` to block activation, or `true` to allow it.
   */
  guard?: TypeaheadTriggerGuard
  /**
   * Called when a match is selected.
   * Returns behavior actions to execute (e.g., delete trigger text, insert content).
   */
  onSelect: TypeaheadSelectActionSet<TMatch>[]
  /**
   * Called when the picker is dismissed.
   * Returns behavior actions to execute (optional cleanup).
   */
  onDismiss?: TypeaheadDismissActionSet[]
}

type SyncConfigWithoutDelimiter<TMatch extends object> =
  BaseConfigWithoutDelimiter<TMatch> & {
    /**
     * Whether `getMatches` returns synchronously or asynchronously.
     * @defaultValue `'sync'`
     */
    mode?: 'sync'
    /**
     * Debounce delay in milliseconds before calling `getMatches`.
     * Useful for expensive local searches.
     * @defaultValue `0` (no debounce)
     */
    debounceMs?: number
    /**
     * Function that returns matches for the current keyword.
     * Called whenever the keyword changes (after debounce if configured).
     */
    getMatches: (context: {keyword: string}) => ReadonlyArray<TMatch>
  }

type SyncConfigWithDelimiter<TMatch extends AutoCompleteMatch> =
  BaseConfigWithDelimiter<TMatch> & {
    /**
     * Whether `getMatches` returns synchronously or asynchronously.
     * @defaultValue `'sync'`
     */
    mode?: 'sync'
    /**
     * Debounce delay in milliseconds before calling `getMatches`.
     * Useful for expensive local searches.
     * @defaultValue `0` (no debounce)
     */
    debounceMs?: number
    /**
     * Function that returns matches for the current keyword.
     * Called whenever the keyword changes (after debounce if configured).
     */
    getMatches: (context: {keyword: string}) => ReadonlyArray<TMatch>
  }

type AsyncConfigWithoutDelimiter<TMatch extends object> =
  BaseConfigWithoutDelimiter<TMatch> & {
    /**
     * Set to `'async'` when `getMatches` returns a Promise.
     */
    mode: 'async'
    /**
     * Debounce delay in milliseconds before calling `getMatches`.
     * Recommended for API calls to reduce request frequency.
     * @defaultValue `0` (no debounce)
     */
    debounceMs?: number
    /**
     * Async function that returns matches for the current keyword.
     * Called whenever the keyword changes (after debounce if configured).
     */
    getMatches: (context: {keyword: string}) => Promise<ReadonlyArray<TMatch>>
  }

type AsyncConfigWithDelimiter<TMatch extends AutoCompleteMatch> =
  BaseConfigWithDelimiter<TMatch> & {
    /**
     * Set to `'async'` when `getMatches` returns a Promise.
     */
    mode: 'async'
    /**
     * Debounce delay in milliseconds before calling `getMatches`.
     * Recommended for API calls to reduce request frequency.
     * @defaultValue `0` (no debounce)
     */
    debounceMs?: number
    /**
     * Async function that returns matches for the current keyword.
     * Called whenever the keyword changes (after debounce if configured).
     */
    getMatches: (context: {keyword: string}) => Promise<ReadonlyArray<TMatch>>
  }

/**
 * Creates a typeahead picker definition to use with {@link useTypeaheadPicker}.
 *
 * @example Emoji picker with auto-complete
 * ```ts
 * const emojiPicker = defineTypeaheadPicker({
 *   trigger: /:/,
 *   keyword: /[\S]+/,
 *   delimiter: ':',
 *   getMatches: ({keyword}) => searchEmojis(keyword),
 *   onSelect: [
 *     ({event}) => [
 *       raise({type: 'delete', at: event.patternSelection}),
 *       raise({type: 'insert.text', text: event.match.emoji}),
 *     ],
 *   ],
 * })
 * ```
 *
 * @example Async mention picker
 * ```ts
 * const mentionPicker = defineTypeaheadPicker({
 *   mode: 'async',
 *   trigger: /@/,
 *   keyword: /[\w]+/,
 *   debounceMs: 200,
 *   getMatches: async ({keyword}) => api.searchUsers(keyword),
 *   onSelect: [
 *     ({event}) => [
 *       raise({type: 'delete', at: event.patternSelection}),
 *       raise({type: 'insert.inline object', inlineObject: {_type: 'mention', userId: event.match.id}}),
 *     ],
 *   ],
 * })
 * ```
 *
 * @example Picker with guard (runs at trigger time)
 * ```ts
 * const emojiPicker = defineTypeaheadPicker({
 *   trigger: /:/,
 *   keyword: /[\S]+/,
 *   getMatches: ({keyword}) => searchEmojis(keyword),
 *   guard: ({snapshot, event, dom}) => {
 *     if (anotherPickerIsOpen()) return false
 *     return true
 *   },
 *   onSelect: [
 *     ({event}) => [
 *       raise({type: 'delete', at: event.patternSelection}),
 *       raise({type: 'insert.text', text: event.match.emoji}),
 *     ],
 *   ],
 * })
 * ```
 *
 * @public
 */
export function defineTypeaheadPicker<TMatch extends object>(
  config: SyncConfigWithoutDelimiter<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends AutoCompleteMatch>(
  config: SyncConfigWithDelimiter<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends object>(
  config: AsyncConfigWithoutDelimiter<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends AutoCompleteMatch>(
  config: AsyncConfigWithDelimiter<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends object>(
  config:
    | SyncConfigWithoutDelimiter<TMatch>
    | SyncConfigWithDelimiter<TMatch & AutoCompleteMatch>
    | AsyncConfigWithoutDelimiter<TMatch>
    | AsyncConfigWithDelimiter<TMatch & AutoCompleteMatch>,
): TypeaheadPickerDefinition<TMatch> {
  return {
    ...config,
    _id: Symbol('typeahead-picker'),
  } as TypeaheadPickerDefinition<TMatch>
}
