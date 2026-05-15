import {useEditor} from '@portabletext/editor'
import {
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import emojis from 'emojilib'
import Fuse from 'fuse.js'
import {useEffect, useLayoutEffect, useRef, useState} from 'react'

/**
 * Typeahead emoji picker. User types ':' followed by a keyword and a
 * floating list of matching emoji appears at the caret. Arrow keys
 * navigate, Enter or click selects, Escape dismisses.
 *
 * Matching uses fuse.js fuzzy search over emojilib's keyword
 * dictionary. Exact-keyword matches sort to the top via the
 * `type: 'exact'` discriminator in EmojiMatch.
 */
type EmojiEntry = {
  emoji: string
  keywords: ReadonlyArray<string>
}

const emojiList: ReadonlyArray<EmojiEntry> = Object.entries(emojis).map(
  ([emoji, keywords]) => ({emoji, keywords}),
)

const fuse = new Fuse(emojiList, {
  keys: ['keywords'],
  threshold: 0.3,
  ignoreLocation: true,
})

function matchEmojis({keyword}: {keyword: string}): ReadonlyArray<EmojiMatch> {
  if (!keyword) {
    return []
  }
  const lower = keyword.toLowerCase()
  return fuse
    .search(keyword)
    .slice(0, 50)
    .map((result): EmojiMatch => {
      const exact = result.item.keywords.find((kw) => kw === lower)
      if (exact) {
        return {
          type: 'exact',
          key: result.item.emoji,
          emoji: result.item.emoji,
          keyword: exact,
        }
      }
      const matchingKeyword =
        result.item.keywords.find((kw) => kw.includes(lower)) ??
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

  const [position, setPosition] = useState<{top: number; left: number} | null>(
    null,
  )

  useLayoutEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }
    const update = () => {
      const rect = editor.dom.getSelectionRect(editor.getSnapshot())
      if (!rect) {
        setPosition(null)
        return
      }
      setPosition({top: rect.bottom + 4, left: rect.left})
    }
    update()
    const id = window.requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [editor, isActive, keyword, matches])

  if (!isActive || !position) {
    return null
  }

  return (
    <div
      className="pc-emoji-picker"
      style={{top: position.top, left: position.left}}
      onMouseDown={(event) => event.preventDefault()}
      role="dialog"
      aria-label="Emoji picker"
    >
      <EmojiListBox
        matches={matches}
        selectedIndex={selectedIndex}
        onDismiss={onDismiss}
        onNavigateTo={onNavigateTo}
        onSelect={onSelect}
      />
    </div>
  )
}

function EmojiListBox(props: {
  matches: ReadonlyArray<EmojiMatch>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.matches.length === 0) {
    return (
      <div className="pc-emoji-picker-empty">
        <span>No matches</span>
        <button
          type="button"
          className="pc-emoji-picker-dismiss"
          onClick={props.onDismiss}
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <ol className="pc-emoji-picker-list">
      {props.matches.slice(0, 50).map((match, index) => (
        <EmojiListItem
          key={`${match.emoji}-${match.keyword}`}
          match={match}
          selected={props.selectedIndex === index}
          onMouseEnter={() => props.onNavigateTo(index)}
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
      className={`pc-emoji-picker-item${props.selected ? ' pc-emoji-picker-item-selected' : ''}`}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span className="pc-emoji-picker-glyph">{props.match.emoji}</span>
      <span className="pc-emoji-picker-keyword">:{props.match.keyword}:</span>
    </li>
  )
}
