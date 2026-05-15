import {
  useEmojiPicker,
  type EmojiMatch,
} from '@portabletext/plugin-emoji-picker'
import {useEffect, useRef} from 'react'
import {TypeaheadPanel} from './typeahead-panel'

/**
 * Emoji picker: typing `:` opens a typeahead. As soon as a keyword
 * matches one of the curated entries, the panel shows hits. Picking
 * an entry inserts its emoji where the colon-prefix sat. The curated
 * list is intentionally small - a couple of dozen common emojis
 * covering reactions, status markers, weather, etc. We avoid the
 * `emojilib` 276 KB JSON dump until somebody actually asks for it.
 */
type EmojiEntry = {emoji: string; keywords: ReadonlyArray<string>}

const emojiTable: ReadonlyArray<EmojiEntry> = [
  {emoji: '😀', keywords: ['smile', 'happy', 'grin', 'face']},
  {emoji: '😁', keywords: ['beam', 'grin', 'happy']},
  {emoji: '😂', keywords: ['joy', 'laugh', 'tears', 'lol']},
  {emoji: '🤣', keywords: ['rofl', 'laugh', 'lmao']},
  {emoji: '😊', keywords: ['blush', 'smile', 'happy']},
  {emoji: '😉', keywords: ['wink']},
  {emoji: '😍', keywords: ['heart-eyes', 'love']},
  {emoji: '😎', keywords: ['cool', 'sunglasses']},
  {emoji: '🤔', keywords: ['thinking', 'hmm', 'think']},
  {emoji: '🙃', keywords: ['upside-down', 'silly']},
  {emoji: '🙂', keywords: ['smile', 'slight']},
  {emoji: '😅', keywords: ['sweat', 'relief', 'phew']},
  {emoji: '😬', keywords: ['grimace', 'awkward', 'yikes']},
  {emoji: '😢', keywords: ['cry', 'sad', 'tear']},
  {emoji: '😭', keywords: ['cry', 'sob', 'weep']},
  {emoji: '🤯', keywords: ['mind-blown', 'shocked']},
  {emoji: '😴', keywords: ['sleep', 'tired', 'zzz']},
  {emoji: '🤝', keywords: ['handshake', 'deal', 'agree']},
  {emoji: '👍', keywords: ['thumbs-up', 'yes', 'approve', 'lgtm']},
  {emoji: '👎', keywords: ['thumbs-down', 'no', 'reject']},
  {emoji: '👏', keywords: ['clap', 'applause', 'bravo']},
  {emoji: '🙌', keywords: ['hands', 'celebrate', 'praise']},
  {emoji: '🙏', keywords: ['pray', 'please', 'thanks']},
  {emoji: '💪', keywords: ['muscle', 'strong', 'flex']},
  {emoji: '🫡', keywords: ['salute', 'yes-sir', 'ok']},
  {emoji: '👀', keywords: ['eyes', 'look', 'see']},
  {emoji: '🧠', keywords: ['brain', 'think', 'smart']},
  {emoji: '🔥', keywords: ['fire', 'hot', 'lit']},
  {emoji: '✨', keywords: ['sparkles', 'magic', 'shine']},
  {emoji: '⭐', keywords: ['star', 'favorite']},
  {emoji: '🌟', keywords: ['glow', 'star', 'shine']},
  {emoji: '💯', keywords: ['hundred', 'percent', 'perfect']},
  {emoji: '🎉', keywords: ['party', 'celebrate', 'tada']},
  {emoji: '🎊', keywords: ['confetti', 'celebrate']},
  {emoji: '🚀', keywords: ['rocket', 'ship', 'launch', 'fast']},
  {emoji: '✅', keywords: ['check', 'done', 'ok', 'yes']},
  {emoji: '❌', keywords: ['cross', 'no', 'fail', 'wrong']},
  {emoji: '⚠️', keywords: ['warning', 'caution', 'alert']},
  {emoji: '❗', keywords: ['exclamation', 'important']},
  {emoji: '❓', keywords: ['question', 'huh', 'unknown']},
  {emoji: '💡', keywords: ['idea', 'lightbulb', 'bright']},
  {emoji: '📝', keywords: ['note', 'memo', 'write']},
  {emoji: '📌', keywords: ['pin', 'pushpin', 'note']},
  {emoji: '📎', keywords: ['paperclip', 'attach']},
  {emoji: '🔗', keywords: ['link', 'chain', 'url']},
  {emoji: '🛠️', keywords: ['tools', 'fix', 'build']},
  {emoji: '🐛', keywords: ['bug', 'insect', 'error']},
  {emoji: '🔧', keywords: ['wrench', 'fix', 'tool']},
  {emoji: '⚡', keywords: ['lightning', 'fast', 'bolt']},
  {emoji: '🌈', keywords: ['rainbow', 'pride', 'colors']},
  {emoji: '☀️', keywords: ['sun', 'sunny', 'day']},
  {emoji: '🌙', keywords: ['moon', 'night', 'crescent']},
  {emoji: '☁️', keywords: ['cloud', 'cloudy']},
  {emoji: '🌧️', keywords: ['rain', 'cloud-rain']},
  {emoji: '❄️', keywords: ['snow', 'snowflake', 'cold']},
  {emoji: '☕', keywords: ['coffee', 'tea', 'hot']},
  {emoji: '🍵', keywords: ['tea', 'green-tea']},
  {emoji: '🍰', keywords: ['cake', 'dessert']},
  {emoji: '🍕', keywords: ['pizza', 'food']},
  {emoji: '🐱', keywords: ['cat', 'kitty']},
  {emoji: '🐶', keywords: ['dog', 'puppy']},
  {emoji: '🦄', keywords: ['unicorn', 'magic', 'rare']},
  {emoji: '🐙', keywords: ['octopus', 'sea']},
  {emoji: '🎯', keywords: ['target', 'dart', 'bullseye', 'goal']},
  {emoji: '📚', keywords: ['books', 'library', 'read']},
  {emoji: '🎨', keywords: ['art', 'palette', 'design']},
  {emoji: '🎵', keywords: ['music', 'note', 'song']},
  {emoji: '🎬', keywords: ['movie', 'film', 'clapper']},
  {emoji: '🏁', keywords: ['flag', 'finish', 'done']},
  {emoji: '💬', keywords: ['speech', 'chat', 'message']},
  {emoji: '💭', keywords: ['thought', 'thinking', 'bubble']},
  {emoji: '❤️', keywords: ['heart', 'love']},
  {emoji: '🩷', keywords: ['heart', 'pink']},
  {emoji: '🧡', keywords: ['heart', 'orange']},
  {emoji: '💛', keywords: ['heart', 'yellow']},
  {emoji: '💚', keywords: ['heart', 'green']},
  {emoji: '💙', keywords: ['heart', 'blue']},
  {emoji: '💜', keywords: ['heart', 'purple']},
  {emoji: '🖤', keywords: ['heart', 'black']},
  {emoji: '🤍', keywords: ['heart', 'white']},
  {emoji: '💔', keywords: ['broken-heart']},
]

function matchEmojis({keyword}: {keyword: string}): ReadonlyArray<EmojiMatch> {
  if (!keyword) {
    return []
  }
  const term = keyword.toLowerCase()
  const exact: Array<EmojiMatch> = []
  const partial: Array<EmojiMatch> = []
  for (const entry of emojiTable) {
    const hit = entry.keywords.find((kw) => kw === term)
    if (hit) {
      exact.push({
        type: 'exact',
        key: `${entry.emoji}-${hit}`,
        emoji: entry.emoji,
        keyword: hit,
      })
      continue
    }
    const partialKeyword =
      entry.keywords.find((kw) => kw.startsWith(term)) ??
      entry.keywords.find((kw) => kw.includes(term))
    if (partialKeyword) {
      partial.push({
        type: 'partial',
        key: `${entry.emoji}-${partialKeyword}`,
        emoji: entry.emoji,
        keyword: partialKeyword,
        startSlice: '',
        endSlice: '',
      })
    }
  }
  return exact.concat(partial).slice(0, 30)
}

export function EmojiPickerPlugin() {
  const {keyword, matches, selectedIndex, onNavigateTo, onSelect} =
    useEmojiPicker({matchEmojis})
  const isActive = keyword.length >= 1
  return (
    <TypeaheadPanel active={isActive}>
      {matches.length === 0 ? (
        <div className="pc-typeahead-empty">
          No emojis matching ":{keyword}"
        </div>
      ) : (
        <ul className="pc-typeahead-list">
          {matches.map((match, index) => (
            <EmojiItem
              key={match.key}
              match={match}
              selected={index === selectedIndex}
              onHover={() => onNavigateTo(index)}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </TypeaheadPanel>
  )
}

function EmojiItem(props: {
  match: EmojiMatch
  selected: boolean
  onHover: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({block: 'nearest'})
    }
  }, [props.selected])
  return (
    <li
      ref={ref}
      className={`pc-typeahead-item pc-typeahead-item-row${props.selected ? ' pc-typeahead-item-selected' : ''}`}
      onMouseEnter={props.onHover}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onSelect}
    >
      <span className="pc-emoji">{props.match.emoji}</span>
      <span className="pc-typeahead-item-hint">:{props.match.keyword}:</span>
    </li>
  )
}
