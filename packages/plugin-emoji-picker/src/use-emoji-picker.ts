import {useEditor} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useCallback} from 'react'
import {emojiPickerMachine} from './emoji-picker-machine'
import type {EmojiMatch, MatchEmojis} from './match-emojis'

/**
 * @beta
 */
export type EmojiPicker<TEmojiMatch = EmojiMatch> = {
  /**
   * The matched keyword, including colons.
   *
   * Can be used to display the keyword in the UI or conditionally render the
   * list of matches.
   *
   * @example
   * ```tsx
   * if (keyword.length < 2) {
   *   return null
   * }
   * ```
   */
  keyword: string

  /**
   * Emoji matches found for the current keyword.
   *
   * Can be used to display the matches in a list.
   */
  matches: ReadonlyArray<TEmojiMatch>

  /**
   * The index of the selected match.
   *
   * Can be used to highlight the selected match in the list.
   *
   * @example
   * ```tsx
   * <EmojiListItem
   *   key={match.key}
   *   match={match}
   *   selected={selectedIndex === index}
   * />
   * ```
   */
  selectedIndex: number

  /**
   * Navigate to a specific match by index.
   *
   * Can be used to control the `selectedIndex`. For example, using
   * `onMouseEnter`.
   *
   * @example
   * ```tsx
   * <EmojiListItem
   *   key={match.key}
   *   match={match}
   *   selected={selectedIndex === index}
   *   onMouseEnter={() => {onNavigateTo(index)}}
   * />
   * ```
   */
  onNavigateTo: (index: number) => void

  /**
   * Select the current match.
   *
   * Can be used to insert the currently selected match.
   *
   *
   * @example
   * ```tsx
   * <EmojiListItem
   *   key={match.key}
   *   match={match}
   *   selected={selectedIndex === index}
   *   onMouseEnter={() => {onNavigateTo(index)}}
   *   onSelect={() => {onSelect()}}
   * />
   * ```
   *
   * Note: The currently selected match is automatically inserted on Enter or
   * Tab.
   */
  onSelect: () => void

  /**
   * Dismiss the emoji picker. Can be used to let the user dismiss the picker
   * by clicking a button.
   *
   * @example
   * ```tsx
   * {matches.length === 0 ? (
   *   <Button onPress={onDismiss}>Dismiss</Button>
   * ) : <EmojiListBox {...props} />}
   * ```
   *
   * Note: The emoji picker is automatically dismissed on Escape.
   */
  onDismiss: () => void
}

/**
 * @beta
 */
export type EmojiPickerProps<TEmojiMatch = EmojiMatch> = {
  matchEmojis: MatchEmojis<TEmojiMatch>
}

/**
 * Handles the state and logic needed to create an emoji picker.
 *
 * The `matchEmojis` function is generic and can return any shape of emoji
 * match required for the emoji picker.
 *
 * However, the default implementation of `matchEmojis` returns an array of
 * `EmojiMatch` objects and can be created using the `createMatchEmojis`
 * function.
 *
 * @example
 *
 * ```tsx
 * const matchEmojis = createMatchEmojis({emojis: {
 *   '😂': ['joy'],
 *   '😹': ['joy_cat'],
 * }})
 *
 * const {keyword, matches, selectedIndex, onDismiss, onNavigateTo, onSelect} =
 *   useEmojiPicker({matchEmojis})
 * ```
 *
 *  Note: This hook is not concerned with the UI, how the emoji picker is
 * rendered or positioned in the document.
 *
 * @beta
 */
export function useEmojiPicker<TEmojiMatch = EmojiMatch>(
  props: EmojiPickerProps<TEmojiMatch>,
): EmojiPicker<TEmojiMatch> {
  const editor = useEditor()
  const emojiPickerActor = useActorRef(emojiPickerMachine, {
    input: {editor, matchEmojis: props.matchEmojis as MatchEmojis<EmojiMatch>},
  })
  const keyword = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.keyword,
  )
  const matches = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.matches as ReadonlyArray<TEmojiMatch>,
  )
  const selectedIndex = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.selectedIndex,
  )

  const onDismiss = useCallback(() => {
    emojiPickerActor.send({type: 'dismiss'})
  }, [emojiPickerActor])
  const onNavigateTo = useCallback(
    (index: number) => {
      emojiPickerActor.send({type: 'navigate to', index})
    },
    [emojiPickerActor],
  )
  const onSelect = useCallback(() => {
    emojiPickerActor.send({type: 'insert selected match'})
    editor.send({type: 'focus'})
  }, [emojiPickerActor, editor])

  return {
    keyword,
    matches,
    selectedIndex,
    onDismiss,
    onNavigateTo,
    onSelect,
  }
}
