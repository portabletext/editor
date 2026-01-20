import type {
  AutoCompleteMatch,
  TypeaheadPickerDefinition,
  TypeaheadSelectActionSet,
} from './typeahead-picker.types'

type BaseConfigWithoutDelimiter<TMatch extends object> = {
  trigger: RegExp
  keyword: RegExp
  delimiter?: undefined
  actions: Array<TypeaheadSelectActionSet<TMatch>>
}

type BaseConfigWithDelimiter<TMatch extends AutoCompleteMatch> = {
  trigger: RegExp
  keyword: RegExp
  delimiter: string
  actions: Array<TypeaheadSelectActionSet<TMatch>>
}

type SyncConfigWithoutDelimiter<TMatch extends object> =
  BaseConfigWithoutDelimiter<TMatch> & {
    mode?: 'sync'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => ReadonlyArray<TMatch>
  }

type SyncConfigWithDelimiter<TMatch extends AutoCompleteMatch> =
  BaseConfigWithDelimiter<TMatch> & {
    mode?: 'sync'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => ReadonlyArray<TMatch>
  }

type AsyncConfigWithoutDelimiter<TMatch extends object> =
  BaseConfigWithoutDelimiter<TMatch> & {
    mode: 'async'
    debounceMs?: number
    getMatches: (context: {keyword: string}) => Promise<ReadonlyArray<TMatch>>
  }

type AsyncConfigWithDelimiter<TMatch extends AutoCompleteMatch> =
  BaseConfigWithDelimiter<TMatch> & {
    mode: 'async'
    debounceMs?: number
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
 *   actions: [insertEmojiAction],
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
 *   actions: [insertMentionAction],
 * })
 * ```
 *
 * @example Slash commands at start of block
 * ```ts
 * const slashCommandPicker = defineTypeaheadPicker({
 *   trigger: /^\//,
 *   keyword: /[\w]+/,
 *   getMatches: ({keyword}) => filterCommands(keyword),
 *   actions: [executeCommandAction],
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
