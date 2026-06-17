---
name: portable-text
description: Work with Portable Text, a JSON-based specification for structured block content. Use this skill to render Portable Text in React, HTML, Vue, Svelte, or Markdown, to build a block content editor with @portabletext/editor, or to convert HTML and Markdown into Portable Text.
---

# Portable Text

Portable Text is an open, JSON-based specification for structured block content.
Content is stored as an array of typed blocks: each block has a `_type` and
carries its own data. The same content renders to React, HTML, Markdown, or any
other target through a serializer.

Full documentation index: https://www.portabletext.org/llms.txt
Complete corpus: https://www.portabletext.org/llms-full.txt
Every page is available as Markdown by appending `.md` (e.g. `/rendering/react.md`).

## Rendering existing Portable Text

Pick the serializer for the target. Pass the Portable Text value to it.

- React: `@portabletext/react` exposes `<PortableText value={value} />`. Override
  defaults with the `components` prop (`marks`, `types`, `block`, `list`).
  See `/rendering/react.md`.
- HTML string: `@portabletext/to-html` (`toHTML`). Works in Node, Deno, edge, and
  browsers. See `/rendering/html.md`.
- Vue: `@portabletext/vue`. See `/rendering/vue.md`.
- Svelte: `@portabletext/svelte`. See `/rendering/svelte.md`.
- Markdown: `@portabletext/markdown`. See `/rendering/markdown.md`.

Unknown block types are skipped unless you provide a component for them, so
custom types never crash a render.

## Building an editor

`@portabletext/editor` is a headless, schema-driven React editor.

1. Define a schema with `defineSchema({decorators, styles, lists, ...})`.
2. Wrap the editor in `EditorProvider` to supply the schema and initial value.
3. Render `PortableTextEditable` for the editable surface.
4. Listen for changes with `EventListenerPlugin` from `@portabletext/editor/plugins`.

Toolbars come from `@portabletext/toolbar` and keyboard shortcuts from
`@portabletext/keyboard-shortcuts`. Editor behavior is customized through the
Behavior API (`defineBehavior`). Start at `/editor/getting-started.md`.

## Converting into Portable Text

- HTML to Portable Text: `@portabletext/block-tools` (`htmlToBlocks`).
  See `/conversion/html-to-portable-text.md`.
- Markdown to Portable Text: `@portabletext/markdown`.
  See `/conversion/markdown-to-portable-text.md`.

## When unsure

Read `/llms-full.txt` for the full documentation, or fetch the `.md` variant of
the relevant page. Do not invent block types or component APIs; the schema and
the serializer `components` map define what exists.
