import {
  matchEmojis,
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import {usePopover} from '@portabletext/toolbar'
import {useEffect, useRef} from 'react'
import {Button} from './primitives/button'
import {Popover} from './primitives/popover'

export function EmojiPickerPlugin() {
  const {keyword, matches, selectedIndex, onDismiss, onNavigateTo, onSelect} =
    useEmojiPicker({matchEmojis})

  if (keyword.length < 2) {
    return null
  }

  return (
    <EmojiPickerPopover
      keyword={keyword}
      matches={matches}
      selectedIndex={selectedIndex}
      onDismiss={onDismiss}
      onNavigateTo={onNavigateTo}
      onSelect={onSelect}
    />
  )
}

function EmojiPickerPopover(props: {
  keyword: string
  matches: Array<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  const popover = usePopover({
    guard: () => true,
    placement: 'top',
  })

  if (!popover.snapshot.matches('active')) {
    return null
  }

  return (
    <Popover
      className="p-0"
      isNonModal
      triggerRef={popover.snapshot.context.anchorRef}
      crossOffset={popover.snapshot.context.crossOffset}
      offset={popover.snapshot.context.offset}
      placement={popover.snapshot.context.placement}
      isOpen={props.keyword.length >= 2}
    >
      <EmojiListBox
        keyword={props.keyword}
        matches={props.matches}
        selectedIndex={props.selectedIndex}
        onDismiss={props.onDismiss}
        onNavigateTo={props.onNavigateTo}
        onSelect={props.onSelect}
      />
    </Popover>
  )
}

function EmojiListBox(props: {
  keyword: string
  matches: Array<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  return (
    <div className="rounded">
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
