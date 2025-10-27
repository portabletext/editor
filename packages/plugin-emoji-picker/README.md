# `@portabletext/plugin-emoji-picker`

> ⚡️ Easily configure an Emoji Picker for the Portable Text Editor

## Quick Start

The `useEmojiPicker` hook handles the state and logic needed to create an emoji picker for the Portable Text Editor. It manages keyword matching, keyboard navigation, and emoji insertion, but is not concerned with the UI, how the picker is rendered, or how it's positioned in the document.

```tsx
import {matchEmojis, useEmojiPicker} from '@portabletext/plugin-emoji-picker'

function EmojiPicker() {
  const {keyword, matches, selectedIndex, onNavigateTo, onSelect, onDismiss} =
    useEmojiPicker({matchEmojis})

  if (keyword.length < 2) {
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

- `keyword`: The matches keyword, including colons.
- `matches`: Emoji matches found for the current keyword.
- `selectedIndex`: Index of the selected match
- `onNavigateTo(index)`: Navigate to a specific match by index.
- `onSelect()`: Select the current match.
- `onDismiss()`: Dismiss the emoji picker.

## Custom Emoji Sets

The `matchEmojis` function is generic and can return any shape of emoji match required for your UI. However, the default implementation returns `EmojiMatch` objects and can be created using `createMatchEmojis`:

```tsx
import {
  createMatchEmojis,
  useEmojiPicker,
} from '@portabletext/plugin-emoji-picker'

const myMatchEmojis = createMatchEmojis({
  emojis: {
    '😂': ['joy', 'laugh'],
    '😹': ['joy_cat', 'laugh_cat'],
    '❤️': ['heart', 'love'],
    '🎉': ['party', 'celebrate'],
  },
})

function MyEmojiPicker() {
  const picker = useEmojiPicker({matchEmojis: myMatchEmojis})
  // ... render your UI
}
```

The default `matchEmojis` export includes a comprehensive set of emojis. You can also implement a completely custom matching function that returns any shape you need for your specific UI requirements.
