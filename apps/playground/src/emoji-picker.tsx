import {useEditor} from '@portabletext/editor'
import {
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import emojis from 'emojilib'
import Fuse from 'fuse.js'
import {useEffect, useRef} from 'react'
import {Button} from './primitives/button'
import {FloatingPanel} from './primitives/floating-panel'

type EmojiEntry = {
  emoji: string
  keywords: string[]
}

const emojiList: EmojiEntry[] = Object.entries(emojis).map(
  ([emoji, keywords]) => ({
    emoji,
    keywords,
  }),
)

const fuse = new Fuse(emojiList, {
  keys: ['keywords'],
  threshold: 0.3,
  ignoreLocation: true,
})

function matchEmojis({keyword}: {keyword: string}): EmojiMatch[] {
  if (!keyword) {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()

  return fuse
    .search(keyword)
    .slice(0, 50)
    .map((result): EmojiMatch => {
      const exactKeyword = result.item.keywords.find(
        (kw) => kw === lowerKeyword,
      )

      if (exactKeyword) {
        return {
          type: 'exact',
          key: result.item.emoji,
          emoji: result.item.emoji,
          keyword: exactKeyword,
        }
      }

      const matchingKeyword =
        result.item.keywords.find((kw) => kw.includes(lowerKeyword)) ??
        result.item.keywords[0] ??
        ''

      return {
        type: 'partial',
        key: result.item.emoji,
        emoji: result.item.emoji,
        keyword: matchingKeyword,
        startSlice: '',
        endSlice: '',
      }
    })
}

export function EmojiPickerPlugin() {
  const editor = useEditor()
  const {keyword, matches, selectedIndex, onDismiss, onNavigateTo, onSelect} =
    useEmojiPicker({matchEmojis})

  const isActive = keyword.length >= 1

  const getAnchorRect = () => editor.dom.getSelectionRect(editor.getSnapshot())

  if (!isActive) {
    return null
  }

  return (
    <FloatingPanel getAnchorRect={getAnchorRect} offset={4}>
      <EmojiListBox
        keyword={keyword}
        matches={matches}
        selectedIndex={selectedIndex}
        onDismiss={onDismiss}
        onNavigateTo={onNavigateTo}
        onSelect={onSelect}
      />
    </FloatingPanel>
  )
}

const MAX_VISIBLE_MATCHES = 50

export function EmojiListBox(props: {
  keyword: string
  matches: ReadonlyArray<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.matches.length === 0) {
    return (
      <div className="p-2 flex align-middle gap-2">
        No results found{' '}
        <Button size="sm" variant="secondary" onPress={props.onDismiss}>
          Dismiss
        </Button>
      </div>
    )
  }

  const visibleMatches = props.matches.slice(0, MAX_VISIBLE_MATCHES)

  return (
    <ol className="p-1" style={{maxHeight: 200, overflowY: 'auto'}}>
      {visibleMatches.map((match, index) => (
        <EmojiListItem
          key={`${match.emoji}-${match.keyword}`}
          match={match}
          selected={props.selectedIndex === index}
          onMouseEnter={() => {
            props.onNavigateTo(index)
          }}
          onSelect={props.onSelect}
        />
      ))}
    </ol>
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

  return (
    <li
      ref={ref}
      className={`px-2 py-1 cursor-pointer rounded ${
        props.selected ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span className="mr-2">{props.match.emoji}</span>
      <span className="text-gray-500">:{props.match.keyword}:</span>
    </li>
  )
}
