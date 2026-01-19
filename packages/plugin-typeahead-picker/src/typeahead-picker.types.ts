import type {EditorSelection} from '@portabletext/editor'
import type {BehaviorActionSet} from '@portabletext/editor/behaviors'

/**
 * Match type for pickers with auto-completion support.
 * Use this when `autoCompleteWith` is configured.
 *
 * The `type` property indicates how well the match corresponds to the keyword:
 * - `'exact'` - The keyword matches this item exactly (e.g., keyword `joy` matches emoji `:joy:`)
 * - `'partial'` - The keyword partially matches this item (e.g., keyword `jo` matches `:joy:`)
 *
 * When `autoCompleteWith` is configured and there's exactly one `'exact'` match,
 * the picker will auto-insert that match.
 *
 * @example
 * ```ts
 * // With autoCompleteWith - type field required for auto-completion
 * type EmojiMatch = AutoCompleteMatch & {
 *   key: string
 *   emoji: string
 *   shortcode: string
 * }
 * ```
 *
 * @public
 */
export type AutoCompleteMatch = {
  type: 'exact' | 'partial'
}

/**
 * Function that retrieves matches for a given keyword.
 *
 * Return synchronously for local data (like emoji shortcodes) or
 * asynchronously for remote data (like user mentions from an API).
 *
 * The `mode` option in `defineTypeaheadPicker` enforces the correct return type:
 * - `mode: 'sync'` (default) - Must return `Array<TMatch>`
 * - `mode: 'async'` - Must return `Promise<Array<TMatch>>`
 *
 * @example
 * ```ts
 * // Sync: filter a local array
 * const getEmojis: GetMatches<EmojiMatch> = ({keyword}) =>
 *   emojis.filter(e => e.shortcode.includes(keyword))
 *
 * // Async: fetch from an API
 * const getUsers: GetMatches<UserMatch> = async ({keyword}) =>
 *   await api.searchUsers(keyword)
 * ```
 *
 * @public
 */
export type GetMatches<TMatch extends object> = (context: {
  keyword: string
}) => ReadonlyArray<TMatch> | Promise<ReadonlyArray<TMatch>>

/**
 * Event passed to typeahead select action sets.
 *
 * @public
 */
export type TypeaheadSelectEvent<TMatch> = {
  type: 'typeahead.select'
  /** The match that was selected */
  match: TMatch
  /** The extracted keyword (e.g., `joy` from `:joy`) */
  keyword: string
  /** Selection range covering the full pattern match (e.g., `:joy`) for replacement */
  patternSelection: NonNullable<EditorSelection>
}

/**
 * Action function that runs when a match is selected.
 * Returns an array of behavior actions to execute (e.g., delete trigger text, insert content).
 *
 * @example
 * ```ts
 * const insertEmoji: TypeaheadSelectActionSet<EmojiMatch> = (
 *   {event},
 * ) => [
 *   raise({type: 'delete', at: event.patternSelection}),
 *   raise({type: 'insert.text', text: event.match.emoji}),
 * ]
 * ```
 *
 * @public
 */
export type TypeaheadSelectActionSet<TMatch> = BehaviorActionSet<
  TypeaheadSelectEvent<TMatch>,
  true
>

type TypeaheadPickerDefinitionBase<TMatch extends object> = {
  /**
   * RegExp pattern for matching trigger + keyword.
   *
   * If pattern has capture groups: keyword = first capture group (additional groups ignored).
   * If no capture group: keyword = entire match.
   *
   * Can include position anchors like `^` for start-of-block triggers.
   *
   * @example
   * ```ts
   * // Emoji picker - `:` trigger anywhere
   * pattern: /:(\S*)/
   *
   * // Slash commands - `/` only at start of block
   * pattern: /^\/(\w*)/
   *
   * // Mentions - `@` trigger anywhere
   * pattern: /@(\w*)/
   * ```
   */
  pattern: RegExp

  /**
   * Optional delimiter that triggers auto-completion.
   * When typed after a keyword with exactly one exact match, that match auto-inserts.
   * @example `':'` - typing `:joy:` auto-inserts the joy emoji
   */
  autoCompleteWith?: string

  /**
   * Actions to execute when a match is selected.
   * Typically deletes the trigger text and inserts the selected content.
   *
   * @see {@link TypeaheadSelectActionSet}
   */
  actions: Array<TypeaheadSelectActionSet<TMatch>>
}

/**
 * Configuration object that defines a typeahead picker's behavior.
 *
 * Create using {@link (defineTypeaheadPicker:1)} and pass to {@link useTypeaheadPicker}.
 *
 * @example
 * ```ts
 * const emojiPicker = defineTypeaheadPicker({
 *   pattern: /:(\S*)/,
 *   autoCompleteWith: ':',
 *   getMatches: ({keyword}) => searchEmojis(keyword),
 *   actions: [insertEmojiAction],
 * })
 * ```
 *
 * @public
 */
export type TypeaheadPickerDefinition<TMatch extends object = object> =
  TypeaheadPickerDefinitionBase<TMatch> & {
    /** @internal Unique identifier for this picker definition */
    readonly _id: symbol

    /**
     * Whether `getMatches` returns synchronously or asynchronously.
     * @defaultValue `'sync'`
     */
    mode?: 'sync' | 'async'

    /**
     * Debounce delay in milliseconds before calling `getMatches`.
     * Useful for both async (API calls) and sync (expensive local search) modes.
     * @defaultValue `0` (no debounce)
     * @example `debounceMs: 200` - wait 200ms after last keystroke
     */
    debounceMs?: number

    /**
     * Function that retrieves matches for the current keyword.
     * Use the `debounceMs` option to reduce calls during rapid typing.
     */
    getMatches: GetMatches<TMatch>
  }

/**
 * Events that can be sent to the picker via `send()`.
 *
 * - `{type: 'select'}` - Insert the currently selected match
 * - `{type: 'dismiss'}` - Close the picker without inserting
 * - `{type: 'navigate to', index}` - Change the selected match (e.g., on hover or arrow keys)
 *
 * @public
 */
export type TypeaheadPickerEvent =
  | {type: 'select'}
  | {type: 'dismiss'}
  | {type: 'navigate to'; index: number}

/**
 * Possible states for the picker, used with `snapshot.matches()`.
 *
 * Top-level states:
 * - `'idle'` - No trigger pattern detected, picker is inactive
 * - `'active'` - Trigger detected, picker is active (use nested states for specifics)
 *
 * Nested active states (use object syntax):
 * - `{active: 'loading'}` - Waiting for async matches (no results yet)
 * - `{active: 'no matches'}` - No results found
 * - `{active: 'showing matches'}` - Displaying results
 *
 * Nested substates (for background loading without flicker):
 * - `{active: {'no matches': 'loading'}}` - No results, fetching in background
 * - `{active: {'showing matches': 'loading'}}` - Displaying results, fetching in background
 *
 * @example
 * ```ts
 * if (picker.snapshot.matches('idle')) return null
 * if (picker.snapshot.matches({active: 'loading'})) return <Spinner />
 * if (picker.snapshot.matches({active: 'showing matches'})) return <MatchList />
 *
 * // Optional: show subtle refresh indicator
 * const isRefreshing = picker.snapshot.matches({active: {'showing matches': 'loading'}})
 * ```
 *
 * @public
 */
export type TypeaheadPickerState =
  | 'idle'
  | 'active'
  | {active: 'loading'}
  | {active: 'no matches'}
  | {active: {'no matches': 'loading'}}
  | {active: 'showing matches'}
  | {active: {'showing matches': 'loading'}}

/**
 * Current picker data, accessible via `snapshot.context`.
 *
 * @public
 */
export type TypeaheadPickerContext<TMatch> = {
  /** The extracted keyword from the trigger pattern (e.g., `joy` from `:joy`) */
  keyword: string
  /** The current list of matches returned by `getMatches` */
  matches: ReadonlyArray<TMatch>
  /** Index of the currently selected match (for keyboard navigation and highlighting) */
  selectedIndex: number
  /** Error from `getMatches` if it threw, otherwise `undefined` */
  error: Error | undefined
}

/**
 * The picker instance returned by {@link useTypeaheadPicker}.
 *
 * Provides a state machine-like interface for building picker UI:
 * - Use `snapshot.matches()` to check the current state and render accordingly
 * - Use `snapshot.context` to access the keyword, matches, and selected index
 * - Use `send()` to dispatch events like select, dismiss, or navigate
 *
 * @example
 * ```tsx
 * function EmojiPicker() {
 *   const picker = useTypeaheadPicker(emojiPickerDefinition)
 *
 *   if (picker.snapshot.matches('idle')) return null
 *   if (picker.snapshot.matches({active: 'loading'})) return <Spinner />
 *   if (picker.snapshot.matches({active: 'no matches'})) return <NoResults />
 *
 *   const {matches, selectedIndex} = picker.snapshot.context
 *
 *   return (
 *     <ul>
 *       {matches.map((match, i) => (
 *         <li
 *           key={match.key}
 *           aria-selected={i === selectedIndex}
 *           onMouseEnter={() => picker.send({type: 'navigate to', index: i})}
 *           onClick={() => picker.send({type: 'select'})}
 *         >
 *           {match.emoji} {match.shortcode}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @public
 */
export type TypeaheadPicker<TMatch extends object> = {
  snapshot: {
    /**
     * Check if the picker is in a specific state.
     * @see {@link TypeaheadPickerState} for available states
     */
    matches: (state: TypeaheadPickerState) => boolean

    /**
     * Current picker data including keyword, matches, and selection.
     */
    context: TypeaheadPickerContext<TMatch>
  }

  /**
   * Dispatch an event to the picker.
   * @see {@link TypeaheadPickerEvent} for available events
   */
  send: (event: TypeaheadPickerEvent) => void
}
