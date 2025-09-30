import {useEditor} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useCallback} from 'react'
import {emojiPickerMachine} from './emoji-picker-machine'
import type {MatchEmojis} from './match-emojis'

/**
 * @beta
 */
export function useEmojiPicker(props: {matchEmojis: MatchEmojis}) {
  const editor = useEditor()
  const emojiPickerActor = useActorRef(emojiPickerMachine, {
    input: {editor, matchEmojis: props.matchEmojis},
  })
  const keyword = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.keyword,
  )
  const matches = useSelector(
    emojiPickerActor,
    (snapshot) => snapshot.context.matches,
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
