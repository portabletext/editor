import type {
  AutoCompleteMatch,
  TypeaheadPickerDefinition,
  TypeaheadSelectActionSet,
} from './typeahead-picker.types'

type BaseConfigWithoutAutoComplete<TMatch extends object> = {
  pattern: RegExp
  autoCompleteWith?: undefined
  actions: Array<TypeaheadSelectActionSet<TMatch>>
}

type BaseConfigWithAutoComplete<TMatch extends AutoCompleteMatch> = {
  pattern: RegExp
  autoCompleteWith: string
  actions: Array<TypeaheadSelectActionSet<TMatch>>
}

type SyncConfigWithoutAutoComplete<TMatch extends object> =
  BaseConfigWithoutAutoComplete<TMatch> & {
    mode?: 'sync'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => Array<TMatch>
  }

type SyncConfigWithAutoComplete<TMatch extends AutoCompleteMatch> =
  BaseConfigWithAutoComplete<TMatch> & {
    mode?: 'sync'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => Array<TMatch>
  }

type AsyncConfigWithoutAutoComplete<TMatch extends object> =
  BaseConfigWithoutAutoComplete<TMatch> & {
    mode: 'async'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => Promise<Array<TMatch>>
  }

type AsyncConfigWithAutoComplete<TMatch extends AutoCompleteMatch> =
  BaseConfigWithAutoComplete<TMatch> & {
    mode: 'async'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => Promise<Array<TMatch>>
  }

/**
 * Creates a typeahead picker definition to use with {@link useTypeaheadPicker}.
 *
 * @example Emoji picker with auto-complete
 * ```ts
 * const emojiPicker = defineTypeaheadPicker({
 *   pattern: /:(\S*)/,
 *   autoCompleteWith: ':',
 *   getMatches: ({keyword}) => searchEmojis(keyword),
 *   actions: [({event}) => [
 *     raise({type: 'delete', at: event.patternSelection}),
 *     raise({type: 'insert.text', text: event.match.emoji}),
 *   ]],
 * })
 * ```
 *
 * @example Async mention picker
 * ```ts
 * const mentionPicker = defineTypeaheadPicker({
 *   mode: 'async',
 *   pattern: /@(\w*)/,
 *   debounceMs: 200,
 *   getMatches: async ({keyword}) => api.searchUsers(keyword),
 *   actions: [({event}) => [
 *     raise({type: 'delete', at: event.patternSelection}),
 *     raise({type: 'insert.text', text: event.match.name}),
 *   ]],
 * })
 * ```
 *
 * @example Slash commands at start of block
 * ```ts
 * const slashCommandPicker = defineTypeaheadPicker({
 *   pattern: /^\/(\w*)/,  // ^ anchors to start of block
 *   getMatches: ({keyword}) => filterCommands(keyword),
 *   actions: [({event}) => [
 *     raise({type: 'delete', at: event.patternSelection}),
 *     raise(event.match.action),
 *   ]],
 * })
 * ```
 *
 * @public
 */
export function defineTypeaheadPicker<TMatch extends object>(
  config: SyncConfigWithoutAutoComplete<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends AutoCompleteMatch>(
  config: SyncConfigWithAutoComplete<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends object>(
  config: AsyncConfigWithoutAutoComplete<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends AutoCompleteMatch>(
  config: AsyncConfigWithAutoComplete<TMatch>,
): TypeaheadPickerDefinition<TMatch>
/** @public */
export function defineTypeaheadPicker<TMatch extends object>(
  config:
    | SyncConfigWithoutAutoComplete<TMatch>
    | SyncConfigWithAutoComplete<TMatch & AutoCompleteMatch>
    | AsyncConfigWithoutAutoComplete<TMatch>
    | AsyncConfigWithAutoComplete<TMatch & AutoCompleteMatch>,
): TypeaheadPickerDefinition<TMatch> {
  return {
    ...config,
    _id: Symbol('typeahead-picker'),
  } as TypeaheadPickerDefinition<TMatch>
}
