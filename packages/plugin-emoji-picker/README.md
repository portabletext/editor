# `@portabletext/plugin-emoji-picker`

> ⚡️ Easily configure an Emoji Picker for the Portable Text Editor

## Quick Start

The `useEmojiPicker` hook handles the state and logic needed to create an emoji picker for the Portable Text Editor. It manages keyword matching, keyboard navigation, and emoji insertion, but is not concerned with the UI, how the picker is rendered, or how it's positioned in the document.

```tsx
import {
  createMatchEmojis,
  useEmojiPicker,
} from '@portabletext/plugin-emoji-picker'

const matchEmojis = createMatchEmojis({
  emojis: {
    '😂': ['joy', 'laugh'],
    '❤️': ['heart', 'love'],
    '🎉': ['party', 'celebrate'],
    '👍': ['thumbsup', 'yes', 'approve'],
    '🔥': ['fire', 'hot', 'lit'],
  },
})

function EmojiPicker() {
  const {keyword, matches, selectedIndex, onNavigateTo, onSelect, onDismiss} =
    useEmojiPicker({matchEmojis})

  if (keyword.length < 1) {
    return null
  }

  return (
    <div className="emoji-picker">
      {matches.length === 0 ? (
        <div>
          No emojis found for "{keyword}"
          <button onClick={onDismiss}>Dismiss</button>
        </div>
      ) : (
        <ul>
          {matches.map((match, index) => (
            <li
              key={match.key}
              onMouseEnter={() => onNavigateTo(index)}
              onClick={onSelect}
              className={selectedIndex === index ? 'selected' : ''}
            >
              {match.emoji} {match.keyword}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**Tip:** For a comprehensive emoji library, you can install [`emojilib`](https://www.npmjs.com/package/emojilib) and use it directly:

```tsx
import emojilib from 'emojilib'

const matchEmojis = createMatchEmojis({
  emojis: emojilib,
})
```

## How It Works

The emoji picker activates when users type `:` followed by a keyword (e.g., `:smile` or `:joy`).

- **Keyboard shortcuts are built-in**:
  - `Enter` or `Tab` inserts the selected emoji
  - `↑` / `↓` navigate through matches
  - `Esc` dismisses the picker
- **Mouse interactions are opt-in**: Use `onNavigateTo` and `onSelect` to enable hover and click

## API Reference

### `useEmojiPicker(props)`

**Props:**

- `matchEmojis`: A function that takes a keyword and returns matching emojis

**Returns:**

- `keyword`: The matched keyword.
- `matches`: Emoji matches found for the current keyword.
- `selectedIndex`: Index of the selected match
- `onNavigateTo(index)`: Navigate to a specific match by index.
- `onSelect()`: Select the current match.
- `onDismiss()`: Dismiss the emoji picker.

## Custom Search Algorithm

You can implement a custom search algorithm with your own matching logic and data structures. The only requirement is that your function adheres to the `MatchEmojis` type and returns matches that extend `BaseEmojiMatch`:

```tsx
import type {
  BaseEmojiMatch,
  MatchEmojis,
} from '@portabletext/plugin-emoji-picker'

// Custom emoji match type with relevance scoring
type CustomEmojiMatch = BaseEmojiMatch & {
  key: string
  label: string
  score: number
}

// Custom search algorithm with fuzzy matching and scoring
const myCustomMatchEmojis: MatchEmojis<CustomEmojiMatch> = ({keyword}) => {
  const emojis = [
    {emoji: '😂', labels: ['joy', 'laugh', 'happy']},
    {emoji: '❤️', labels: ['heart', 'love']},
    {emoji: '🎉', labels: ['party', 'celebrate', 'tada']},
  ]

  return emojis
    .flatMap(({emoji, labels}) =>
      labels
        .map((label) => {
          // Calculate relevance score
          const isExact = label === keyword
          const score = label.startsWith(keyword)
            ? 100 // Exact prefix match
            : label.includes(keyword)
              ? 50 // Contains keyword
              : 0 // No match

          return {
            type: isExact ? 'exact' : 'partial',
            key: `${emoji}-${label}`,
            emoji,
            label,
            score,
          } as CustomEmojiMatch
        })
        .filter((match) => match.score > 0),
    )
    .sort((a, b) => b.score - a.score) // Sort by relevance
    .slice(0, 10) // Limit to 10 results
}

function MyEmojiPicker() {
  const picker = useEmojiPicker({matchEmojis: myCustomMatchEmojis})
  // ... render your UI with custom match data
}
```
