import {useEditor} from '@portabletext/editor'
import {
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import emojis from 'emojilib'
import Fuse, {type FuseResult} from 'fuse.js'
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

function fuseResultToEmojiMatch(result: FuseResult<EmojiEntry>): EmojiMatch {
  const match = result.matches?.[0]
  const matchedKeyword = match?.value ?? result.item.keywords[0] ?? ''
  const indices = match?.indices?.[0]

  if (indices) {
    const [start, end] = indices
    const startSlice = matchedKeyword.slice(0, start)
    const matchedPart = matchedKeyword.slice(start, end + 1)
    const endSlice = matchedKeyword.slice(end + 1)

    if (startSlice === '' && endSlice === '') {
      return {
        type: 'exact',
        key: result.item.emoji,
        emoji: result.item.emoji,
        keyword: matchedPart,
      }
    }

    return {
      type: 'partial',
      key: result.item.emoji,
      emoji: result.item.emoji,
      keyword: matchedPart,
      startSlice,
      endSlice,
    }
  }

  return {
    type: 'exact',
    key: result.item.emoji,
    emoji: result.item.emoji,
    keyword: matchedKeyword,
  }
}

// Pre-filter emoji list by first character to reduce Fuse.js search space
function getFilteredEmojiList(keyword: string): EmojiEntry[] {
  if (!keyword) {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()

  // Filter to emojis that have at least one keyword containing the first char
  // This dramatically reduces the search space for Fuse.js
  return emojiList.filter((entry) =>
    entry.keywords.some((kw) => kw.includes(lowerKeyword[0])),
  )
}

// Cache to avoid re-creating Fuse instances
let cachedFilterChar = ''
let cachedFuse: Fuse<EmojiEntry> | null = null

function getFuseForKeyword(keyword: string): Fuse<EmojiEntry> {
  const filterChar = keyword[0]?.toLowerCase() ?? ''

  if (filterChar !== cachedFilterChar || !cachedFuse) {
    cachedFilterChar = filterChar
    const filtered = getFilteredEmojiList(keyword)
    cachedFuse = new Fuse(filtered, {
      keys: ['keywords'],
      threshold: 0.3,
      includeMatches: true,
    })
  }

  return cachedFuse
}

function matchEmojis({keyword}: {keyword: string}): EmojiMatch[] {
  if (!keyword || keyword.length > 20) {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()

  // Check for exact match first (fast path)
  const exactMatch = emojiList.find((entry) =>
    entry.keywords.includes(lowerKeyword),
  )

  const fuse = getFuseForKeyword(keyword)

  if (exactMatch) {
    return [
      {
        type: 'exact' as const,
        key: exactMatch.emoji,
        emoji: exactMatch.emoji,
        keyword,
      },
      ...fuse
        .search(keyword)
        .slice(0, 50)
        .filter((result) => result.item.emoji !== exactMatch.emoji)
        .map(fuseResultToEmojiMatch),
    ]
  }

  return fuse.search(keyword).slice(0, 50).map(fuseResultToEmojiMatch)
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
      <span className="text-gray-500">
        :{props.match.type === 'partial' && props.match.startSlice}
        <span className="bg-yellow-200 text-gray-700">
          {props.match.keyword}
        </span>
        {props.match.type === 'partial' && props.match.endSlice}:
      </span>
    </li>
  )
}
