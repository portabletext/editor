<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/portabletext/portabletext/master/logo-white.svg?sanitize=true">
  <img alt="Portable Text Logo" src="https://raw.githubusercontent.com/portabletext/portabletext/master/logo.svg?sanitize=true">
</picture>

# Portable Text Editor Monorepo

This monorepo contains the official [Portable Text](https://github.com/portabletext/portabletext) editor and related packages for building rich text editing experiences.

For documentation and guides, visit [portabletext.org](https://www.portabletext.org/).

## Packages

### Core

#### `@portabletext/editor`

> The official editor for editing Portable Text

- 💻 [`./packages/editor`](./packages/editor/)
- 📦 [@portabletext/editor](https://www.npmjs.com/package/@portabletext/editor)

#### `@portabletext/schema`

> Define and compile Portable Text schemas with full type safety

- 💻 [`./packages/schema`](./packages/schema/)
- 📦 [@portabletext/schema](https://www.npmjs.com/package/@portabletext/schema)

#### `@portabletext/toolbar`

> React hooks for building toolbars and related UI components

- 💻 [`./packages/toolbar`](./packages/toolbar/)
- 📦 [@portabletext/toolbar](https://www.npmjs.com/package/@portabletext/toolbar)

### Editor Plugins

#### `@portabletext/plugin-character-pair-decorator`

> Automatically match a pair of characters and decorate the text in between

- 💻 [`./packages/plugin-character-pair-decorator`](./packages/plugin-character-pair-decorator/)
- 📦 [@portabletext/plugin-character-pair-decorator](https://www.npmjs.com/package/@portabletext/plugin-character-pair-decorator)

#### `@portabletext/plugin-emoji-picker`

> Easily configure an Emoji Picker for the Portable Text Editor

- 💻 [`./packages/plugin-emoji-picker`](./packages/plugin-emoji-picker/)
- 📦 [@portabletext/plugin-emoji-picker](https://www.npmjs.com/package/@portabletext/plugin-emoji-picker)

#### `@portabletext/plugin-input-rule`

> Easily configure Input Rules in the Portable Text Editor

- 💻 [`./packages/plugin-input-rule`](./packages/plugin-input-rule/)
- 📦 [@portabletext/plugin-input-rule](https://www.npmjs.com/package/@portabletext/plugin-input-rule)

#### `@portabletext/plugin-markdown-shortcuts`

> Adds helpful Markdown shortcuts to the editor

- 💻 [`./packages/plugin-markdown-shortcuts`](./packages/plugin-markdown-shortcuts/)
- 📦 [@portabletext/plugin-markdown-shortcuts](https://www.npmjs.com/package/@portabletext/plugin-markdown-shortcuts)

#### `@portabletext/plugin-one-line`

> Restricts the Portable Text Editor to a single line

- 💻 [`./packages/plugin-one-line`](./packages/plugin-one-line/)
- 📦 [@portabletext/plugin-one-line](https://www.npmjs.com/package/@portabletext/plugin-one-line)

#### `@portabletext/plugin-sdk-value`

> Connects a Portable Text Editor with a Sanity document using the SDK

- 💻 [`./packages/plugin-sdk-value`](./packages/plugin-sdk-value/)
- 📦 [@portabletext/plugin-sdk-value](https://www.npmjs.com/package/@portabletext/plugin-sdk-value)

#### `@portabletext/plugin-typography`

> Automatically transform text to typographic variants

- 💻 [`./packages/plugin-typography`](./packages/plugin-typography/)
- 📦 [@portabletext/plugin-typography](https://www.npmjs.com/package/@portabletext/plugin-typography)

### Other Libraries

#### `@portabletext/block-tools`

> Various tools for processing Portable Text

- 💻 [`./packages/block-tools`](./packages/block-tools/)
- 📦 [@portabletext/block-tools](https://www.npmjs.com/package/@portabletext/block-tools)

#### `@portabletext/markdown`

> Convert Portable Text to Markdown and back again

- 💻 [`./packages/markdown`](./packages/markdown/)
- 📦 [@portabletext/markdown](https://www.npmjs.com/package/@portabletext/markdown)

#### `@portabletext/keyboard-shortcuts`

> Platform-aware keyboard shortcuts

- 💻 [`./packages/keyboard-shortcuts`](./packages/keyboard-shortcuts/)
- 📦 [@portabletext/keyboard-shortcuts](https://www.npmjs.com/package/@portabletext/keyboard-shortcuts)

#### `@portabletext/sanity-bridge`

> Convert between Sanity schemas and Portable Text schemas

- 💻 [`./packages/sanity-bridge`](./packages/sanity-bridge/)
- 📦 [@portabletext/sanity-bridge](https://www.npmjs.com/package/@portabletext/sanity-bridge)

#### `@portabletext/patches`

> Apply Sanity patches to a value

- 💻 [`./packages/patches`](./packages/patches/)
- 📦 [@portabletext/patches](https://www.npmjs.com/package/@portabletext/patches)

#### `@portabletext/test`

> Testing utilities for the Portable Text Editor

- 💻 [`./packages/test`](./packages/test/)
- 📦 [@portabletext/test](https://www.npmjs.com/package/@portabletext/test)

#### `@portabletext/racejar`

> A testing framework agnostic Gherkin driver

- 💻 [`./packages/racejar`](./packages/racejar/)
- 📦 [@portabletext/racejar](https://www.npmjs.com/package/@portabletext/racejar)
