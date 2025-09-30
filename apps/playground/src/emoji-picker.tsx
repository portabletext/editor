import {
  matchEmojis,
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import {useEffect, useRef} from 'react'
import {Button} from './primitives/button'

export function EmojiPickerPlugin() {
  const {keyword, matches, selectedIndex, onDismiss, onNavigateTo, onSelect} =
    useEmojiPicker({matchEmojis})

  return (
    <EmojiListBox
      keyword={keyword}
      matches={matches}
      selectedIndex={selectedIndex}
      onDismiss={onDismiss}
      onNavigateTo={onNavigateTo}
      onSelect={onSelect}
    />
  )
}

export function EmojiListBox(props: {
  keyword: string
  matches: Array<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.keyword.length < 2) {
    return null
  }

  return (
    <div className="border border-gray-300 rounded bg-white shadow">
      {props.matches.length === 0 ? (
        <div className="p-2 flex align-middle gap-2">
          No results found{' '}
          <Button size="sm" variant="secondary" onPress={props.onDismiss}>
            Dismiss
          </Button>
        </div>
      ) : (
        <ol className="p-2" style={{maxHeight: 200, overflowY: 'auto'}}>
          {props.matches.map((match, index) => (
            <EmojiListItem
              key={
                match.type === 'exact'
                  ? `${match.emoji}-${match.keyword}`
                  : `${match.emoji}-${match.startSlice}${match.keyword}${match.endSlice}`
              }
              match={match}
              selected={props.selectedIndex === index}
              onMouseEnter={() => {
                props.onNavigateTo(index)
              }}
              onSelect={props.onSelect}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function EmojiListItem(props: {
  match: EmojiMatch
  selected: boolean
  onMouseEnter: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }, [props.selected])

  if (props.match.type === 'exact') {
    return (
      <li
        ref={ref}
        style={{
          background: props.selected ? 'lightblue' : 'unset',
        }}
        onMouseEnter={props.onMouseEnter}
        onClick={props.onSelect}
      >
        <span>{props.match.emoji} :</span>
        <span style={{background: 'yellow'}}>{props.match.keyword}</span>:
      </li>
    )
  }

  return (
    <li
      ref={ref}
      style={{
        background: props.selected ? 'lightblue' : 'unset',
      }}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span>{props.match.emoji} :</span>
      {props.match.startSlice}
      <span style={{background: 'yellow'}}>{props.match.keyword}</span>
      {props.match.endSlice}:
    </li>
  )
}
