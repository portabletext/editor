# `@portabletext/patches`

> Apply Sanity patches to a value

## Installation

```bash
npm install @portabletext/patches
```

## Usage

```ts
import applyPatch, {applyAll} from '@portabletext/patches'

// Apply a single patch
const result = applyPatch(
  {title: 'Hello'},
  {
    type: 'set',
    path: ['title'],
    value: 'Hello, world!',
  },
)

// Apply multiple patches
const result = applyAll({count: 0}, [
  {type: 'inc', path: ['count'], value: 1},
  {type: 'inc', path: ['count'], value: 1},
])
```

## Patch Types

- `set` - Set a value at a path
- `setIfMissing` - Set a value only if it doesn't exist
- `unset` - Remove a value at a path
- `insert` - Insert items into an array
- `inc` / `dec` - Increment or decrement a number
- `diffMatchPatch` - Apply a diff-match-patch string
