# `@portabletext/keyboard-shortcuts`

A TypeScript library for creating platform-aware keyboard shortcuts with automatic detection of Apple vs non-Apple platforms.

## Features

- **Platform Detection**: Automatically detects Apple platforms and uses appropriate key combinations
- **Flexible Definitions**: Support for multiple key combinations per shortcut
- **Event Matching**: Built-in keyboard event matching functionality
- **Common Shortcuts**: Pre-defined shortcuts for common text editing operations

## Installation

```bash
npm install @portabletext/keyboard-shortcuts
```

## API Reference

### `KeyboardEventDefinition`

Defines a single keyboard event that can be part of a shortcut.

```typescript
type KeyboardEventDefinition = (
  | {key: KeyboardEvent['key']; code: KeyboardEvent['code']}
  | {key: KeyboardEvent['key']; code?: undefined}
  | {key?: undefined; code: KeyboardEvent['code']}
) & {
  alt?: KeyboardEvent['altKey']
  ctrl?: KeyboardEvent['ctrlKey']
  meta?: KeyboardEvent['metaKey']
  shift?: KeyboardEvent['shiftKey']
}
```

**Properties:**

- `key`: The keyboard key (case-insensitive)
- `code`: The keyboard code (case-insensitive)
- `alt`: Alt/Option key modifier
- `ctrl`: Ctrl key modifier
- `meta`: Meta/Command key modifier
- `shift`: Shift key modifier

At least one of `key` or `code` must be provided.

### `KeyboardShortcutDefinition`

Defines a complete keyboard shortcut with platform-specific configurations.

```typescript
type KeyboardShortcutDefinition = {
  default: ReadonlyArray<KeyboardEventDefinition>
  apple?: ReadonlyArray<KeyboardEventDefinition>
}
```

**Properties:**

- `default`: Required array of keyboard event definitions for non-Apple platforms
- `apple`: Optional array of keyboard event definitions for Apple platforms (falls back to `default` if not provided)

### `KeyboardShortcut`

A resolved keyboard shortcut for the current platform.

```typescript
type KeyboardShortcut<TKeyboardEvent> = {
  guard: (event: TKeyboardEvent) => boolean
  keys: ReadonlyArray<string>
}
```

**Properties:**

- `guard`: Function that determines if a keyboard event matches this shortcut
- `keys`: Display-friendly key combination for the current platform

### Core Functions

#### `createKeyboardShortcut(definition)`

Creates a `KeyboardShortcut` from a `KeyboardShortcutDefinition`.

```typescript
function createKeyboardShortcut<TKeyboardEvent>(
  definition: KeyboardShortcutDefinition,
): KeyboardShortcut<TKeyboardEvent>
```

**Example:**

```typescript
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

const boldShortcut = createKeyboardShortcut({
  default: [
    {
      key: 'B',
      ctrl: true,
      meta: false,
      alt: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'B',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  ],
})

// On non-Apple platforms: Ctrl+B
// On Apple platforms: ⌘+B
```

**Example:**

```typescript
import {isKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

const definition = {
  key: 'B',
  ctrl: true,
  meta: false,
  alt: false,
  shift: false,
}

const isMatch = isKeyboardShortcut(definition, keyboardEvent)
```

### Common Shortcuts

The library provides pre-defined shortcuts for common text editing operations:

```typescript
import {
  blockquote,
  bold,
  code,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  italic,
  link,
  normal,
  strikeThrough,
  underline,
} from '@portabletext/keyboard-shortcuts'
```

### Usage Examples

#### Basic Usage

```typescript
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

const saveShortcut = createKeyboardShortcut({
  default: [
    {
      key: 'S',
      ctrl: true,
      meta: false,
      alt: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'S',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  ],
})

// Use the shortcut
document.addEventListener('keydown', (event) => {
  if (saveShortcut.guard(event)) {
    event.preventDefault()
    saveDocument()
  }
})

// Display the shortcut keys
console.log(saveShortcut.keys.join('+')) // "Ctrl+S" or "⌘+S"
```

#### Using Pre-defined Shortcuts

```typescript
import {bold, italic} from '@portabletext/keyboard-shortcuts'

document.addEventListener('keydown', (event) => {
  if (bold.guard(event)) {
    event.preventDefault()
    toggleBold()
  } else if (italic.guard(event)) {
    event.preventDefault()
    toggleItalic()
  }
})
```

#### Multiple Key Combinations

```typescript
const deleteShortcut = createKeyboardShortcut({
  default: [
    {key: 'Delete', ctrl: false, meta: false, alt: false, shift: false},
    {key: 'Backspace', ctrl: false, meta: false, alt: false, shift: false},
  ],
})
```
