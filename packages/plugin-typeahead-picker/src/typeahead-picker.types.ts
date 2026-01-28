import type {EditorSelection} from '@portabletext/editor'
import type {
  BehaviorActionSet,
  BehaviorGuard,
} from '@portabletext/editor/behaviors'

/**
 * Match type for pickers with auto-completion support.
 * Use this when `delimiter` is configured.
 *
 * The `type` property indicates how well the match corresponds to the keyword:
 * - `'exact'` - The keyword matches this item exactly (e.g., keyword `joy` matches emoji `:joy:`)
 * - `'partial'` - The keyword partially matches this item (e.g., keyword `jo` matches `:joy:`)
 *
 * When `delimiter` is configured and there's exactly one `'exact'` match,
 * the picker will auto-insert that match.
 *
 * @example
 * ```ts
 * // With delimiter - type field required for auto-completion
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
 * Event passed to `onSelect` when a match is selected.
 *
 * @public
 */
export type TypeaheadSelectEvent<TMatch> = {
  type: 'custom.typeahead select'
  /** The match that was selected */
  match: TMatch
  /** The extracted keyword (e.g., `joy` from `:joy`) */
  keyword: string
  /** Selection range covering the full pattern match (e.g., `:joy`) for replacement */
  patternSelection: NonNullable<EditorSelection>
}

/**
 * Event passed to `onDismiss` when the picker is dismissed.
 *
 * @public
 */
export type TypeaheadDismissEvent = {
  type: 'custom.typeahead dismiss'
  /** Selection range covering the full pattern match (e.g., `@john`) for cleanup */
  patternSelection: NonNullable<EditorSelection>
}

/**
 * Action set that runs when a match is selected.
 * Returns an array of behavior actions to execute (e.g., delete trigger text, insert content).
 *
 * @public
 */
export type TypeaheadSelectActionSet<TMatch> = BehaviorActionSet<
  TypeaheadSelectEvent<TMatch>,
  true
>

/**
 * Action set that runs when the picker is dismissed.
 * Returns an array of behavior actions to execute (optional cleanup).
 *
 * @public
 */
export type TypeaheadDismissActionSet = BehaviorActionSet<
  TypeaheadDismissEvent,
  true
>

/**
 * Event passed to the trigger guard when the picker is about to activate.
 *
 * @public
 */
export type TypeaheadTriggerEvent = {
  type: 'custom.typeahead trigger found'
}

/**
 * Guard function that runs at trigger time to conditionally prevent the picker
 * from activating. Has the same signature as a behavior guard.
 *
 * Return `false` to block activation, or `true` to allow it.
 *
 * @example
 * ```ts
 * guard: ({snapshot, event, dom}) => {
 *   // Block activation if another picker is open
 *   if (anotherPickerIsOpen()) return false
 *
 *   // Allow activation
 *   return true
 * }
 * ```
 *
 * @public
 */
export type TypeaheadTriggerGuard = BehaviorGuard<TypeaheadTriggerEvent, true>

type TypeaheadPickerDefinitionBase<TMatch extends object> = {
  /**
   * Pattern that activates the picker.
   * Can include positional anchors like `^` for start-of-block triggers.
   *
   * @example `/:/` for emoji
   * @example `/@/` for mentions
   * @example `/^\//` for slash commands (start of block only)
   */
  trigger: RegExp

  /**
   * Pattern matching the keyword portion (after trigger, before delimiter).
   * The entire match is used as the keyword.
   *
   * @example `/[\S]+/` for emoji (any non-whitespace)
   * @example `/[\w]+/` for mentions (word characters only)
   */
  keyword: RegExp

  /**
   * Character that triggers auto-completion.
   * Typing this after a keyword with exactly one exact match auto-inserts it.
   *
   * @example `':'` - typing `:joy:` auto-inserts the joy emoji
   */
  delimiter?: string

  /**
   * Guard function that runs at trigger time to conditionally prevent the picker
   * from activating.
   * Return `false` to block activation, or `true` to allow it.
   *
   * @see {@link TypeaheadTriggerGuard}
   */
  guard?: TypeaheadTriggerGuard

  /**
   * Called when a match is selected.
   * Returns behavior actions to execute (e.g., delete trigger text, insert content).
   *
   * @example
   * ```ts
   * onSelect: [
   *   ({event}) => [
   *     raise({type: 'delete', at: event.patternSelection}),
   *     raise({type: 'insert.text', text: event.match.emoji}),
   *   ],
   * ]
   * ```
   */
  onSelect: TypeaheadSelectActionSet<TMatch>[]

  /**
   * Called when the picker is dismissed (Escape, cursor movement, etc.).
   * Returns behavior actions to execute (optional cleanup).
   */
  onDismiss?: TypeaheadDismissActionSet[]
}

/**
 * Configuration object that defines a typeahead picker's behavior.
 *
 * Create using {@link (defineTypeaheadPicker:1)} and pass to {@link useTypeaheadPicker}.
 *
 * @example
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
