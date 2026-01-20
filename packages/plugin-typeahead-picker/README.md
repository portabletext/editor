# `@portabletext/plugin-typeahead-picker`

> Generic typeahead picker infrastructure for the Portable Text Editor

## Quick Start

The `useTypeaheadPicker` hook provides the state and logic needed to build typeahead pickers (emoji pickers, mention pickers, slash commands, etc.) for the Portable Text Editor. It manages keyword matching, keyboard navigation, and triggering of actions, but is not concerned with the UI, how the picker is rendered, or how it's positioned in the document.

```tsx
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
  type AutoCompleteMatch,
} from '@portabletext/plugin-typeahead-picker'

// With `delimiter` configured, matches must include `type: 'exact' | 'partial'`
// for auto-completion to work. Use `AutoCompleteMatch` as the base type.
type EmojiMatch = AutoCompleteMatch & {
  key: string
  emoji: string
  shortcode: string
}

const emojiPicker = defineTypeaheadPicker<EmojiMatch>({
  // Trigger pattern - activates the picker when typed
  trigger: /:/,

  // Keyword pattern - matches characters after the trigger
  keyword: /\S*/,

  // Optional delimiter enables auto-completion.
  // Typing `:joy:` will auto-insert if "joy" is an exact match.
  delimiter: ':',

  // Return matches for the keyword. Can be sync or async (with mode: 'async').
  getMatches: ({keyword}) => searchEmojis(keyword),

  // Actions to execute when a match is selected (Enter/Tab or click).
  // Receives the event containing the selected match and pattern selection.
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}), // Delete `:joy`
      raise({type: 'insert.text', text: event.match.emoji}), // Insert 😂
    ],
  ],
})

function EmojiPicker() {
  // Activate the picker and get its current state
  const picker = useTypeaheadPicker(emojiPicker)

  // Don't render anything when picker is inactive
  if (picker.snapshot.matches('idle')) {
    return null
  }

  const {keyword, matches, selectedIndex} = picker.snapshot.context

  if (matches.length === 0) {
    return <div>No emojis found for "{keyword}"</div>
  }

  return (
    <ul>
      {matches.map((match, index) => (
        <li
          key={match.key}
          aria-selected={index === selectedIndex}
          // Optional: enable mouse hover to select
          onMouseEnter={() => picker.send({type: 'navigate to', index})}
          // Optional: enable click to insert
          onClick={() => picker.send({type: 'select'})}
        >
          {match.emoji} {match.shortcode}
        </li>
      ))}
    </ul>
  )
}

// Render the picker inside EditorProvider, alongside PortableTextEditable
function MyEditor() {
  return (
    <EditorProvider /* ...config */>
      <PortableTextEditable />
      <EmojiPicker />
    </EditorProvider>
  )
}
```

The picker component must be rendered inside `EditorProvider` to access the editor context. Position it as a sibling to `PortableTextEditable` - you'll handle the visual positioning (popover, dropdown, etc.) separately with CSS or a positioning library.

## How It Works

The picker activates when users type the `trigger` pattern (e.g., `:` or `@`). The `keyword` pattern then matches characters typed after the trigger.

- **Keyboard shortcuts are built-in**:
  - `Enter` or `Tab` inserts the selected match
  - `↑` / `↓` navigate through matches
  - `Esc` dismisses the picker
- **Mouse interactions are opt-in**: Use `send({type: 'navigate to', index})` and `send({type: 'select'})` to enable hover and click
- **Auto-completion**: With `delimiter` configured, typing the delimiter after an exact match auto-inserts it (e.g., `:joy:` auto-inserts the emoji)

## Examples

### Emoji picker

```ts
const emojiPicker = defineTypeaheadPicker<EmojiMatch>({
  trigger: /:/,
  keyword: /\S*/,
  delimiter: ':',
  getMatches: ({keyword}) => searchEmojis(keyword),
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.emoji}),
    ],
  ],
})
```

`:joy:` auto-inserts the emoji

### Mention picker (async with debounce)

```ts
// Without `delimiter`, the `type` field is not required on matches.
// MentionMatch can just be: { id: string; name: string }
const mentionPicker = defineTypeaheadPicker<MentionMatch>({
  mode: 'async',
  trigger: /@/,
  keyword: /\w*/,
  debounceMs: 200,
  getMatches: async ({keyword}) => api.searchUsers(keyword),
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({
        type: 'insert.child',
        child: {_type: 'mention', userId: event.match.id},
      }),
    ],
  ],
})
```

`@john` shows matches after 200ms pause, user selects with Enter/Tab

### Slash command picker (start of block only)

```ts
// Without `delimiter`, the `type` field is not required on matches.
const commandPicker = defineTypeaheadPicker<CommandMatch>({
  trigger: /^\//, // ^ anchors to start of block
  keyword: /\w*/,
  getMatches: ({keyword}) => searchCommands(keyword),
  actions: [
    ({event}) => {
      switch (event.match.command) {
        case 'h1':
        case 'h2':
        case 'h3':
          return [
            raise({type: 'delete', at: event.patternSelection}),
            raise({type: 'style.toggle', style: event.match.command}),
          ]
        case 'image':
          return [
            raise({type: 'delete', at: event.patternSelection}),
            raise({type: 'insert.block', block: {_type: 'image'}}),
          ]
        default:
          return [raise({type: 'delete', at: event.patternSelection})]
      }
    },
  ],
})
```

`/heading` shows matching commands, but only when `/` is at the start of a block. Text like `hello /heading` will NOT trigger the picker.

## API Reference

### `defineTypeaheadPicker(config)`

Creates a picker definition to pass to `useTypeaheadPicker`.

**Config:**

| Property     | Type                                   | Description                                                                                                                             |
| ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `trigger`    | `RegExp`                               | Pattern that activates the picker. Can include `^` for start-of-block triggers. Must be single-character (e.g., `/:/`, `/@/`, `/^\//`). |
| `keyword`    | `RegExp`                               | Pattern matching characters after the trigger (e.g., `/\S*/`, `/\w*/`).                                                                 |
| `delimiter`  | `string?`                              | Optional delimiter that triggers auto-completion (e.g., `':'` for `:joy:`)                                                              |
| `mode`       | `'sync' \| 'async'`                    | Whether `getMatches` returns synchronously or a Promise (default: `'sync'`)                                                             |
| `debounceMs` | `number?`                              | Delay in ms before calling `getMatches`. Useful for both async (API calls) and sync (expensive local search) modes. (default: `0`)      |
| `getMatches` | `(ctx: {keyword: string}) => TMatch[]` | Function that returns matches for the keyword                                                                                           |
| `actions`    | `Array<TypeaheadSelectActionSet>`      | Actions to execute when a match is selected                                                                                             |

**Trigger pattern rules:**

- Must be a single-character trigger (e.g., `:`, `@`, `/`)
- Multi-character triggers (e.g., `##`) are not supported
- Position anchors (`^`) allow start-of-block constraints

**How triggering works:**

The picker activates the moment a trigger character is typed. After activation, the keyword is tracked via editor selection changes.

```
User types `:` → Trigger matches → Picker activates with keyword ""
User types `j` → Keyword updates to "j" (via selection tracking)
User types `o` → Keyword updates to "jo"
User types `y` → Keyword updates to "joy"
```

**Trigger compatibility summary:**

| Trigger | Example input | Works? | Why                              |
| ------- | ------------- | ------ | -------------------------------- |
| `/:/`   | `:joy`        | ✅     | Single-char trigger              |
| `/@/`   | `@john`       | ✅     | Single-char trigger              |
| `/^\//` | `/cmd`        | ✅     | Single-char with position anchor |
| `/##/`  | `##tag`       | ❌     | Multi-char triggers unsupported  |

**delimiter requirements:**

When using `delimiter`, the delimiter character must be included in the keyword's character class, otherwise typing it dismisses the picker:

| keyword | delimiter | Example  | Works? | Why                                                 |
| ------- | --------- | -------- | ------ | --------------------------------------------------- |
| `/\S*/` | `:`       | `:joy:`  | ✅     | `\S` matches `:`, cursor stays in match             |
| `/\w*/` | `:`       | `:joy:`  | ✅     | Cursor at match boundary, still valid               |
| `/\w*/` | `#`       | `#tag#`  | ✅     | Cursor at match boundary, still valid               |
| `/\w*/` | `##`      | `#tag##` | ❌     | First `#` moves cursor past match, picker dismisses |

### `useTypeaheadPicker(definition)`

React hook that activates a picker and returns its state.

**Returns:**

| Property                         | Description                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `snapshot.matches(state)`        | Check picker state: `'idle'`, `{active: 'loading'}`, `{active: 'no matches'}`, `{active: 'showing matches'}` |
| `snapshot.context.keyword`       | The current keyword                                                                                          |
| `snapshot.context.matches`       | Array of matches from `getMatches`                                                                           |
| `snapshot.context.selectedIndex` | Index of the currently selected match                                                                        |
| `send(event)`                    | Dispatch events: `{type: 'select'}`, `{type: 'dismiss'}`, `{type: 'navigate to', index}`                     |
| `snapshot.context.error`         | Error from `getMatches` if it threw/rejected, otherwise `undefined`                                          |

## Async Mode

When `mode: 'async'` is configured, the picker handles asynchronous `getMatches` functions with loading states and race condition protection.

### Loading States

Use `snapshot.matches()` to check nested loading states:

```tsx
function MentionPicker() {
  const picker = useTypeaheadPicker(mentionPicker)

  // Initial loading (no results yet)
  const isLoading = picker.snapshot.matches({active: 'loading'})

  // Background refresh (showing stale results while fetching new ones)
  const isRefreshing = picker.snapshot.matches({
    active: {'showing matches': 'loading'},
  })

  // No matches, but still fetching (to avoid flicker)
  const isLoadingNoMatches = picker.snapshot.matches({
    active: {'no matches': 'loading'},
  })

  if (isLoading) return <Spinner />
  if (picker.snapshot.matches({active: 'no matches'})) return <NoResults />

  return (
    <MatchList isRefreshing={isRefreshing}>
      {picker.snapshot.context.matches.map(/* ... */)}
    </MatchList>
  )
}
```

### Race Condition Handling

When users type quickly, earlier slow requests may complete after later fast requests. The picker automatically ignores stale results to prevent them from overwriting fresh data.

## Error Handling

If `getMatches` throws or rejects, the error is captured in `snapshot.context.error`. The picker transitions to `'no matches'` state and continues to function.

```tsx
function EmojiPicker() {
  const picker = useTypeaheadPicker(emojiPicker)
  const {error} = picker.snapshot.context

  if (error) {
    return (
      <div>
        <p>Failed to load: {error.message}</p>
        <button onClick={() => picker.send({type: 'dismiss'})}>Dismiss</button>
      </div>
    )
  }

  // ... render matches
}
```

The error is cleared when the picker returns to idle (e.g., via Escape or cursor movement).

## Advanced Actions

Action functions receive more than just the event. The full payload includes access to the editor snapshot, which is useful for generating keys, accessing the schema, or reading the current editor state.

```tsx
const commandPicker = defineTypeaheadPicker<CommandMatch>({
  trigger: /^\//,
  keyword: /\w*/,
  getMatches: ({keyword}) => searchCommands(keyword),
  actions: [
    ({event, snapshot}) => {
      // Access schema to check for block object fields
      const blockObjectSchema = snapshot.context.schema.blockObjects.find(
        (bo) => bo.name === event.match.blockType,
      )

      // Generate unique keys for inserted blocks
      const blockKey = snapshot.context.keyGenerator()

      return [
        raise({type: 'delete', at: event.patternSelection}),
        raise({
          type: 'insert.block',
          block: {_type: event.match.blockType, _key: blockKey},
        }),
      ]
    },
  ],
})
```

**Action payload:**

| Property   | Description                                                                   |
| ---------- | ----------------------------------------------------------------------------- |
| `event`    | The select event with `match`, `keyword`, and `patternSelection`              |
| `snapshot` | Current editor snapshot with `context.schema`, `context.keyGenerator()`, etc. |

## Performance Guidelines

### Match List Size

Keep your match lists reasonably sized for smooth keyboard navigation:

- **Recommended**: Return 10-50 matches maximum
- **Large datasets**: Filter on the server or use pagination
- **Infinite lists**: Consider virtualizing if rendering many items

```tsx
getMatches: async ({keyword}) => {
  const results = await api.searchUsers(keyword)
  return results.slice(0, 20) // Limit to 20 matches
}
```

### Debounce Timing

Choose debounce values based on your data source:

| Source                         | Recommended `debounceMs` |
| ------------------------------ | ------------------------ |
| Local array filter             | `0` (no debounce)        |
| Expensive local Fuse.js search | `50-100`                 |
| Fast API endpoint              | `150-200`                |
| Slow API endpoint              | `200-300`                |

```tsx
// Local data - no debounce needed
const emojiPicker = defineTypeaheadPicker({
  trigger: /:/,
  keyword: /\S*/,
  getMatches: ({keyword}) => filterEmojis(keyword), // Fast local filter
  // ...
})

// API data - debounce to reduce requests
const mentionPicker = defineTypeaheadPicker({
  mode: 'async',
  debounceMs: 200,
  trigger: /@/,
  keyword: /\w*/,
  getMatches: async ({keyword}) => api.searchUsers(keyword),
  // ...
})
```

### Memory Considerations

- Avoid storing large datasets in component state
- For emoji pickers, consider lazy-loading the emoji database
- Clean up listeners when components unmount (the hook handles this automatically)

## Accessibility

The picker manages keyboard navigation and selection internally, but you're responsible for the UI semantics.

### Recommended ARIA Attributes

```tsx
function PickerUI() {
  const picker = useTypeaheadPicker(definition)
  const {matches, selectedIndex} = picker.snapshot.context

  return (
    <ul role="listbox" aria-label="Suggestions">
      {matches.map((match, index) => (
        <li
          key={match.key}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseEnter={() => picker.send({type: 'navigate to', index})}
          onClick={() => picker.send({type: 'select'})}
        >
          {match.label}
        </li>
      ))}
    </ul>
  )
}
```

### Keyboard Handling

The following keyboard shortcuts are handled automatically by the picker:

| Key       | Action                        |
| --------- | ----------------------------- |
| `↑` / `↓` | Navigate through matches      |
| `Enter`   | Insert selected match         |
| `Tab`     | Insert selected match         |
| `Escape`  | Dismiss picker                |
| `Space`   | Dismiss picker (configurable) |

### Screen Reader Considerations

- Announce match count changes with live regions if desired
- Ensure selected item is visible (scroll into view)
- Provide clear labels for what each match represents

## Troubleshooting

### Picker doesn't activate

- **Check trigger**: Must be a single-character trigger (e.g., `/:/`, `/@/`)
- **Check position anchors**: `^` means start of block, not start of line. `hello /command` won't match `/^\//`
- **Check for conflicts**: Only one picker can be active at a time
- **Avoid multi-character triggers**: Triggers like `/##/` don't work because the picker only activates on newly typed single characters

### Auto-completion doesn't work

- **Check `delimiter`**: Must be set (e.g., `delimiter: ':'`)
- **Check match type**: Matches must include `type: 'exact' | 'partial'`
- **Check for exact match**: Auto-completion only triggers when exactly one match has `type: 'exact'`
- **Check keyword pattern**: The keyword pattern must allow the delimiter character at the boundary. Use `\S*` (matches any non-whitespace) when `delimiter: ':'`

### Stale matches appear

- For async pickers, the race condition handling should prevent this automatically
- If issues persist, check that `getMatches` doesn't cache results incorrectly

### Focus issues after selection

- Ensure your actions include focus restoration if needed:
  ```tsx
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.emoji}),
    ],
    () => [
      effect(({send}) => {
        send({type: 'focus'})
      }),
    ],
  ]
  ```
