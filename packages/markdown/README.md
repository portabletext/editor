# `@portabletext/markdown`

> Convert Portable Text to Markdown and back again

## Installation

```bash
npm install @portabletext/markdown
```

## Quick start

**Markdown → Portable Text**

```ts
import {markdownToPortableText} from '@portabletext/markdown'

const blocks = markdownToPortableText('# Hello **world**')
```

```json
[
  {
    "_type": "block",
    "_key": "f4s8k2",
    "style": "h1",
    "children": [
      {"_type": "span", "_key": "a9c3x1", "text": "Hello ", "marks": []},
      {"_type": "span", "_key": "b7d2m5", "text": "world", "marks": ["strong"]}
    ],
    "markDefs": []
  }
]
```

**Portable Text → Markdown**

```ts
import {portableTextToMarkdown} from '@portabletext/markdown'

const markdown = portableTextToMarkdown([
  {
    _type: 'block',
    _key: 'f4s8k2',
    style: 'h1',
    children: [
      {_type: 'span', _key: 'a9c3x1', text: 'Hello ', marks: []},
      {_type: 'span', _key: 'b7d2m5', text: 'world', marks: ['strong']},
    ],
    markDefs: [],
  },
])
```

```md
# Hello **world**
```

**Edit through Markdown without losing keys**

```ts
import {applyMarkdownEdit, portableTextToMarkdown} from '@portabletext/markdown'

const markdown = portableTextToMarkdown(stored)
const editedMarkdown = markdown.replace('tomorow', 'tomorrow')
const edited = applyMarkdownEdit(stored, editedMarkdown)
// same content as parsing editedMarkdown, with the stored `_key`s
// kept the way the same edit in an editor would have kept them
```

## Supported features

| Feature          | Markdown → Portable Text | Portable Text → Markdown |
| ---------------- | ------------------------ | ------------------------ |
| Headings (h1–h6) | ✅                       | ✅                       |
| Paragraphs       | ✅                       | ✅                       |
| Bold             | ✅                       | ✅                       |
| Italic           | ✅                       | ✅                       |
| Inline code      | ✅                       | ✅                       |
| Strikethrough    | ✅                       | ✅                       |
| Links            | ✅                       | ✅                       |
| Blockquotes      | ✅                       | ✅                       |
| Ordered lists    | ✅                       | ✅                       |
| Unordered lists  | ✅                       | ✅                       |
| Task lists       | ✅                       | ✅                       |
| Nested lists     | ✅                       | ✅                       |
| Code blocks      | ✅                       | ✅                       |
| Horizontal rules | ✅                       | ✅                       |
| Images           | ✅                       | ✅                       |
| Tables           | ✅                       | ✅                       |
| HTML blocks      | ✅                       | ✅                       |
| Callouts         | ✅                       | ✅                       |

## Round-trip behavior

Converting Markdown to Portable Text and back isn't a lossless mirror:

1. Translation preserves semantics, not source spelling: the first MD→PT→MD pass normalizes Markdown to one canonical spelling (autolinks become inline links, indented code becomes fenced code, soft-wrapped lines join into one, and so on).
2. The normalized Markdown is a fixpoint for plain text and the [Supported features](#supported-features) table: parsing it and serializing again reproduces it byte-for-byte.
3. MD→PT survival is schema-driven: a construct whose type the schema doesn't declare keeps its content and drops the structure that named it.
4. PT structures with no Markdown form degrade predictably on PT→MD (extra table header rows flatten into the body, deep or level-skipping lists collapse to relative nesting, unknown marks pass their text through unformatted). Unknown object types round-trip instead: block-level as a ` ```json:object ` fence, inline as a `json:object`-tagged code span, both carrying the value as JSON. A fence or span whose body isn't a JSON object with a `_type` is ordinary code.
5. Identity does not round-trip for text blocks: keys are regenerated on every parse, and adjacent spans with identical marks merge into one. Unknown objects keep their `_key`. [`applyMarkdownEdit`](#applymarkdownedit) restores stored keys after an edit.
6. A hard break and a `\n` in a span's text are exclusive counterparts in both directions: a `\n` always renders as hard-break syntax on the way out, and hard-break syntax always becomes `\n` on the way in, never the space a soft wrap joins with.

The named exceptions to the fixpoint claim: an explicit-scheme URL or email keeps its text but gains a `link` mark on reparse, and a fuzzy `www.` form does too unless it carries markdown-significant punctuation; a hard break inside a heading splits into a second block on reparse, since an ATX heading is single-line; leading or trailing whitespace that CommonMark's own block parsing trims isn't part of the fixpoint; a `code` object with the reserved language `json:object` loses that language on serialization; and span text ending in `json:object` directly before a code-marked span holding a typed JSON object binds into an inline object on reparse.

See [Markdown round-tripping](https://www.portabletext.org/conversion/markdown-round-tripping/) on the docs site for the full contract and worked examples.

## Usage

<!-- The schema table, matcher table, and supported-features table have
     condensed twins on the docs site
     (apps/docs/src/content/docs/conversion/markdown-to-portable-text.mdx).
     Keep them in sync: a claim corrected in one place is stale in the
     other. The Round-trip behavior section above is a summary of
     apps/docs/src/content/docs/conversion/markdown-round-tripping.mdx,
     which is canonical; keep the two in sync the same way. -->

### `markdownToPortableText`

```ts
import {markdownToPortableText} from '@portabletext/markdown'

const blocks = markdownToPortableText(`
# Hello World

This is **bold** and *italic* text with a [link](https://example.com).

- First item
- Second item
`)
```

```json
[
  {
    "_type": "block",
    "_key": "k9f2x1",
    "style": "h1",
    "children": [
      {"_type": "span", "_key": "s1a2b3", "text": "Hello World", "marks": []}
    ],
    "markDefs": []
  },
  {
    "_type": "block",
    "_key": "m3n4p5",
    "style": "normal",
    "children": [
      {"_type": "span", "_key": "s2c3d4", "text": "This is ", "marks": []},
      {"_type": "span", "_key": "s3e4f5", "text": "bold", "marks": ["strong"]},
      {"_type": "span", "_key": "s4g5h6", "text": " and ", "marks": []},
      {"_type": "span", "_key": "s5i6j7", "text": "italic", "marks": ["em"]},
      {"_type": "span", "_key": "s6k7l8", "text": " text with a ", "marks": []},
      {"_type": "span", "_key": "s7m8n9", "text": "link", "marks": ["a1b2c3"]},
      {"_type": "span", "_key": "s8o9p0", "text": ".", "marks": []}
    ],
    "markDefs": [
      {"_type": "link", "_key": "a1b2c3", "href": "https://example.com"}
    ]
  },
  {
    "_type": "block",
    "_key": "q1r2s3",
    "style": "normal",
    "listItem": "bullet",
    "level": 1,
    "children": [
      {"_type": "span", "_key": "s9q0r1", "text": "First item", "marks": []}
    ],
    "markDefs": []
  },
  {
    "_type": "block",
    "_key": "t4u5v6",
    "style": "normal",
    "listItem": "bullet",
    "level": 1,
    "children": [
      {"_type": "span", "_key": "s0s1t2", "text": "Second item", "marks": []}
    ],
    "markDefs": []
  }
]
```

The conversion is driven by two concepts:

- **Schema**: Defines what Portable Text types are available (styles, lists, decorators, annotations, block objects). The library only outputs types that exist in the schema.
- **Matchers**: Control how Markdown elements map to schema types. For example, the `h1` matcher maps `# Heading` to the `'h1'` style.

Out of the box, the library includes sensible defaults for both. Customize them to match your content model.

### Schema configuration

The default schema includes the following definitions:

| Type            | Values                                                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles`        | `'normal'`, `'h1'`, `'h2'`, `'h3'`, `'h4'`, `'h5'`, `'h6'`, `'blockquote'`                                                                                                                                                                                                   |
| `lists`         | `'number'`, `'bullet'`, `'task'`                                                                                                                                                                                                                                             |
| `decorators`    | `'strong'`, `'em'`, `'code'`, `'strike-through'`                                                                                                                                                                                                                             |
| `annotations`   | `'link'` (fields: `'href'`, `'title'`)                                                                                                                                                                                                                                       |
| `blockObjects`  | `'code'` (fields: `'language'`, `'code'`), `'image'` (fields: `'src'`, `'alt'`, `'title'`), `'horizontal-rule'`, `'html'` (fields: `'html'`), `'table'` (the canonical nested shape, see [Default behavior](#default-behavior)), `'callout'` (fields: `'tone'`, `'content'`) |
| `inlineObjects` | `'image'` (fields: `'src'`, `'alt'`, `'title'`)                                                                                                                                                                                                                              |

To use a custom Schema, import `compileSchema` and `defineSchema` from `@portabletext/schema`:

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'

markdownToPortableText(markdown, {
  schema: compileSchema(
    defineSchema({
      styles: [{name: 'normal'}, {name: 'heading 1'}],
    }),
  ),
})
```

To use a Sanity schema, use `@portabletext/sanity-bridge` to convert it to a Portable Text Schema first:

```ts
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'

// Convert a Sanity block array schema to a Portable Text schema
const schema = sanitySchemaToPortableTextSchema(sanityBlockArraySchema)

markdownToPortableText(markdown, {schema})
```

### Matchers

Matchers map Markdown concepts to Portable Text types defined in the Schema. Each default matcher checks if a type exists in the schema and returns the appropriate value.

| Group      | Matcher          | Markdown                | Maps to schema type |
| ---------- | ---------------- | ----------------------- | ------------------- |
| `block`    | `normal`         | Paragraphs              | `'normal'`          |
|            | `h1`–`h6`        | `#` – `######` headings | `'h1'`–`'h6'`       |
|            | `blockquote`     | `>` blockquotes         | `'blockquote'`      |
| `listItem` | `bullet`         | `- ` or `* ` lists      | `'bullet'`          |
|            | `number`         | `1. ` ordered lists     | `'number'`          |
|            | `task`           | `- [ ]` / `- [x]` items | `'task'`            |
| `marks`    | `strong`         | `**bold**`              | `'strong'`          |
|            | `em`             | `*italic*`              | `'em'`              |
|            | `code`           | `` `inline code` ``     | `'code'`            |
|            | `strikeThrough`  | `~~strikethrough~~`     | `'strike-through'`  |
|            | `link`           | `[text](url "title")`   | `'link'`            |
| `types`    | `code`           | Fenced code blocks      | `'code'`            |
|            | `horizontalRule` | `---`                   | `'horizontal-rule'` |
|            | `image`          | `![alt](src)`           | `'image'`           |
|            | `html`           | HTML blocks             | `'html'`            |
|            | `callout`        | `> [!NOTE]`, etc.       | `'callout'`         |
|            | `table`          | GFM pipe tables         | `'table'`           |
|            | `blockquote`\*   | `>` blockquotes         | `'blockquote'`      |
|            | `list`\*         | `- ` or `1. ` lists     | `'list'`            |

\* Opt-in, not registered by default: `blockquote` and `list` map onto structural container shapes, and the parser only produces those shapes when you register the matcher (see [Configuring matchers](#configuring-matchers)). Without them, blockquotes and lists parse to flat text blocks, which is the standard Portable Text shape for both, not a degraded fallback.

#### Default behavior

**Tables** (GFM pipe tables) convert by default, in the canonical shape `@portabletext/plugin-table` expects: a `table` block object (`headerRows`, `rows`), each row a `row` object (`cells`), each cell a `cell` object (`value`, an array of Portable Text blocks; a cell holding a single image becomes a standalone block-level `image` object instead of a text block wrapping it). `alignment` is a `@portabletext/markdown` extension field; `@portabletext/plugin-table` ignores it. This needs no configuration when the schema declares a `table` block object with a `rows` field (see `blockObjects` above). A schema whose `table` doesn't declare `rows`, or that doesn't declare `table` at all, produces no table object at all: the table's cell content flattens into top-level blocks, in reading order, and the table structure is discarded.

**Images** are handled based on context:

- Standalone images (a paragraph containing only an image) become block-level `'image'` objects
- Images mixed with text become inline `'image'` objects (if the schema includes `'image'` in `inlineObjects`)
- If neither is supported, falls back to plain text: `![alt](src)`

The default image matcher requires the schema type to have a `'src'` field. If your `'image'` type doesn't include this field, the matcher returns `undefined`.

**Code** is handled based on the Markdown syntax:

- Fenced code blocks (` ``` `) become `'code'` block objects with `language` and `code` fields
- Inline code (`` ` ``) applies the `'code'` decorator to a span

The default code block matcher requires the schema type to have a `'code'` field. If your `'code'` type doesn't include this field, the matcher returns `undefined`.

**Links** support optional titles using `[text](url "title")` syntax. The title is captured in the `'title'` field of the `'link'` annotation.

**Line breaks**: soft-wrapped lines within a paragraph join with a single space; a hard break (two or more trailing spaces, or a backslash, before the newline) becomes a line break within the block.

**Nested lists** are handled automatically. Each list item block includes a `level` property indicating its nesting depth (1 for top-level, 2 for nested, etc.).

**HTML blocks** (like `<div>...</div>`) become `'html'` block objects with the raw HTML in the `'html'` field. Inline HTML is controlled by the `html.inline` option.

**Callouts** use the `> [!TYPE]` syntax (GFM alerts) where `TYPE` is one of `NOTE`, `TIP`, `WARNING`, `CAUTION`, or `IMPORTANT`. They become `'callout'` block objects with a `'tone'` field (the lowercased type name) and a `'content'` field (an array of Portable Text blocks). When the schema doesn't include a `'callout'` block object, the content falls back to blockquote-styled blocks.

#### Configuring matchers

You can provide custom matchers to change how Markdown maps to your schema.

**Custom heading style:** If your schema uses `'heading 1'` instead of `'h1'`:

```ts
markdownToPortableText(markdown, {
  schema: compileSchema(
    defineSchema({
      // Your schema including a 'heading 1' style
    }),
  ),
  block: {
    h1: ({context}) => {
      // Check if 'heading 1' exists in the schema
      const style = context.schema.styles.find((s) => s.name === 'heading 1')
      return style?.name
    },
  },
})
```

> **Note:** Checking if the type exists in the schema isn't required, but it's good practice. Returning `undefined` skips unsupported types.

**Table matcher:** GFM pipe tables convert by default (see [Default behavior](#default-behavior)). Provide your own matcher to map onto a differently-shaped `table` type:

```ts
markdownToPortableText(markdown, {
  types: {
    table: ({context, value}) => {
      const tableType = context.schema.blockObjects.find(
        (obj) => obj.name === 'table',
      )
      if (!tableType) return undefined

      return {
        _type: 'table',
        _key: context.keyGenerator(),
        rows: value.rows,
        headerRows: value.headerRows,
      }
    },
  },
})
```

**List matcher:** By default, lists are emitted as flat text blocks with `listItem` and `level` fields, and adjacent blocks form a list at render time. If your schema models lists as a structural block-object instead (a `list` type with an `items` array holding `list-item` objects, each with a `content` array), provide a `types.list` matcher to opt into that shape:

```ts
markdownToPortableText(markdown, {
  schema: schemaWithList,
  types: {
    list: ({context, value}) => ({
      _type: 'list',
      _key: context.keyGenerator(),
      kind: value.kind, // 'bullet' | 'number' | 'task'
      items: value.items, // each item: {_type, _key, checked?, content: [...]}
    }),
  },
})
```

The matcher receives `value.items` already assembled. Each item's `content` array holds whatever blocks the markdown produced inside the item: text blocks, code blocks, callouts, images, even nested lists. `kind` is promoted to `'task'` automatically when any item carries a GFM checkbox (`- [ ]` / `- [x]`); items only carry a `checked` field when the markdown actually has one. If the matcher returns `undefined`, the parser falls back to flat-list parsing for that list.

Without `types.list`, the existing flat-block path runs unchanged.

**GFM task lists** (`- [ ]` / `- [x]`): Task lists are recognized when the schema declares a `task` list item; the default schema does, so task lists parse zero-config. Without a `task` definition (a custom schema that omits it), the checkbox markers are stripped from the text and the items render as their surrounding list type (bullet or number). With a `task` definition, items carrying a checkbox become text blocks with `listItem: 'task'` and a `checked: boolean` field; items without a checkbox keep their surrounding list type.

```ts
markdownToPortableText('- [x] done\n- [ ] todo', {
  schema: compileSchema(
    defineSchema({
      lists: [{name: 'bullet'}, {name: 'task'}],
    }),
  ),
})
// → [
//   {_type: 'block', listItem: 'task', level: 1, checked: true,  children: [{text: 'done', ...}], ...},
//   {_type: 'block', listItem: 'task', level: 1, checked: false, children: [{text: 'todo', ...}], ...},
// ]
```

If your schema uses a different name for the task list type (e.g. `'todo'`), provide a custom `listItem.task` matcher:

```ts
markdownToPortableText(markdown, {
  schema: compileSchema(defineSchema({lists: [{name: 'todo'}]})),
  listItem: {
    task: ({context}) =>
      context.schema.lists.find((list) => list.name === 'todo')?.name,
  },
})
```

When emitting Portable Text back to Markdown, blocks with `listItem: 'task'` render as `- [x] ` or `- [ ] ` based on the `checked` field.

**Blockquote matcher:** By default, blockquotes are emitted as flat text blocks with `style: 'blockquote'`, and adjacent blocks form a visual blockquote at render time. If your schema models a blockquote as a structural block-object instead (a `blockquote` type with a `content` array), provide a `types.blockquote` matcher to opt into that shape:

```ts
markdownToPortableText(markdown, {
  schema: schemaWithBlockquote,
  types: {
    blockquote: ({context, value}) => ({
      _type: 'blockquote',
      _key: context.keyGenerator(),
      content: value.content, // array of blocks the markdown produced inside the blockquote
    }),
  },
})
```

The matcher receives `value.content` already assembled. The array holds whatever blocks the markdown produced inside the blockquote: text blocks, code blocks, images, even nested blockquotes. GFM alerts (`> [!NOTE]`, `> [!TIP]`, etc.) use a different token stream and produce callouts instead, so `types.blockquote` and `types.callout` can be registered side-by-side without conflict.

If the matcher returns `undefined`, the parser falls back to flat-style by re-emitting the content blocks with `style: 'blockquote'`.

Without `types.blockquote`, the existing flat-block path runs unchanged.

Matchers receive:

- `context.schema` – the compiled schema to validate against
- `context.keyGenerator` – function to generate unique keys
- `value` – the parsed Markdown data (structure depends on the matcher type)
- `isInline` – whether the element appears inline (for `ObjectMatcher` only)

Return `undefined` to skip the element (e.g., if the type isn't in the schema).

#### Other options

```ts
markdownToPortableText(markdown, {
  // Custom key generator for blocks and spans
  keyGenerator: () => nanoid(),

  // Configure how inline HTML is handled (default: 'skip')
  html: {
    inline: 'skip' | 'text', // 'skip' ignores inline HTML, 'text' converts it to plain text
  },
})
```

#### Reporting degradation

Every construct the schema can't represent (a decorator not in the schema, a table with no `table` block object, a task checkbox with no `task` list, and so on) degrades to a lossier shape rather than throwing. A ` ```json:object ` fence or tagged code span that fails to reconstruct (invalid JSON, or no string `_type`) reports too, as `object-carrier-invalid`, even on a schema that would otherwise accept everything: it's the payload that's unusable, not the schema. `onDegradation` observes both, one callback covering all uses. Left unset, the conversion stays silent and returns the lossiest representation it can build, since a library shouldn't log on its own initiative. Passed a function, observe the losses: it's called once, after the whole document has been walked, only when at least one construct degraded, with a report object holding every `Degradation` in encounter order and a canonical grouped `message`. Enforce against lossy output by throwing your own error from inside that callback; the throw propagates out of `markdownToPortableText`.

```ts
markdownToPortableText(markdown, {
  onDegradation: ({degradations, message}) => {
    // degradations: every Degradation, in encounter order
    // message: the same degradations grouped, snippeted, and sorted by line
    logger.warn(message)
  },
})
```

Each `Degradation` carries `type`, a human-readable `message`, `line` when a source line is available, and `snippet` (the offending construct's text, truncated to 40 characters) when there's a specific piece of source text to quote. Match on `type`, not `message`: the type is the stable contract, the message can change between releases.

Enforcing means throwing your own error from inside the callback:

```ts
markdownToPortableText('# heading\n\n**bold**', {
  schema: compileSchema(defineSchema({})),
  onDegradation: ({message}) => {
    throw new Error(message)
  },
})
// throws Error:
// Markdown could not be converted without loss:
// - line 1: `#` heading became a normal paragraph: the schema has no `h1` style ("heading")
// - line 3: Removed bold formatting, kept the text: the schema has no `strong` decorator ("bold")
```

Repeated declines of the same kind (the same missing decorator on three spans, say) collapse into one line of `message` instead of repeating the sentence: `- Removed bold formatting, kept the text: the schema has no \`strong\` decorator (3×: "a", "b", "c")`. `degradations` stays ungrouped, one entry per occurrence.

### `portableTextToMarkdown`

```ts
import {portableTextToMarkdown} from '@portabletext/markdown'

const markdown = portableTextToMarkdown([
  {
    _type: 'block',
    _key: 'k9f2x1',
    style: 'h1',
    children: [{_type: 'span', _key: 's1a2b3', text: 'Hello World', marks: []}],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'm3n4p5',
    style: 'normal',
    children: [
      {_type: 'span', _key: 's2c3d4', text: 'This is ', marks: []},
      {_type: 'span', _key: 's3e4f5', text: 'bold', marks: ['strong']},
      {_type: 'span', _key: 's4g5h6', text: ' and ', marks: []},
      {_type: 'span', _key: 's5i6j7', text: 'italic', marks: ['em']},
      {_type: 'span', _key: 's6k7l8', text: ' text with a ', marks: []},
      {_type: 'span', _key: 's7m8n9', text: 'link', marks: ['a1b2c3']},
      {_type: 'span', _key: 's8o9p0', text: '.', marks: []},
    ],
    markDefs: [{_type: 'link', _key: 'a1b2c3', href: 'https://example.com'}],
  },
  {
    _type: 'block',
    _key: 'q1r2s3',
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{_type: 'span', _key: 's9q0r1', text: 'First item', marks: []}],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 't4u5v6',
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{_type: 'span', _key: 's0s1t2', text: 'Second item', marks: []}],
    markDefs: [],
  },
])
```

```md
# Hello World

This is **bold** and _italic_ text with a [link](https://example.com).

- First item
- Second item
```

The conversion is driven by **Renderers**: functions that render Portable Text elements to Markdown strings. The library includes default renderers for common types; provide your own for custom block types.

#### Default renderers

| Group               | Renderer          | Renders                           | Output                   |
| ------------------- | ----------------- | --------------------------------- | ------------------------ |
| `types`             | `callout`         | `callout` block objects           | `> [!TYPE]\n> content`   |
|                     | `code`            | `code` block objects              | Fenced code block        |
|                     | `horizontal-rule` | `horizontal-rule` block objects   | `---`                    |
|                     | `html`            | `html` block objects              | Raw HTML                 |
|                     | `image`           | `image` block/inline objects      | `![alt](src "title")`    |
|                     | `table`           | `table` block objects             | Markdown table           |
| `block`             | `normal`          | Paragraphs                        | `{children}`             |
|                     | `h1`–`h6`         | Headings                          | `# `–`###### `           |
|                     | `blockquote`      | Blockquotes                       | `> {children}`           |
| `marks`             | `strong`          | Bold text                         | `**{children}**`         |
|                     | `em`              | Italic text                       | `_{children}_`           |
|                     | `code`            | Inline code                       | `` `{children}` ``       |
|                     | `underline`       | Underlined text                   | `<u>{children}</u>`      |
|                     | `strike-through`  | Strikethrough                     | `~~{children}~~`         |
|                     | `link`            | Links                             | `[{children}](url)`      |
| `listItem`          |                   | List items (bullet, number, task) | `- `, `1. `, or `- [x] ` |
| `hardBreak`         |                   | Line breaks within blocks         | `  \n` (two spaces)      |
| `blockSpacing`      |                   | Spacing between blocks            | `\n\n`, `\n`, `\n>\n`    |
| `unknownType`       |                   | Unknown block types               | JSON code block          |
| `unknownBlockStyle` |                   | Unknown block styles              | `{children}`             |
| `unknownListItem`   |                   | Unknown list item types           | `- {children}`           |
| `unknownMark`       |                   | Unknown marks                     | `{children}`             |

Unknown types render as JSON code blocks by default; unknown styles, list items, and marks pass through their children.

The default type renderers are collision-safe: because the serializer dispatches on the `_type` name alone, `code`, `html`, `image`, `callout`, and `table` fall back to the `unknownType` renderer (a JSON code block) when a value doesn't match the shape their renderer expects (say, your own differently-shaped `code` type); `horizontal-rule` has no shape to check and always renders `---`. Register your own `types.<name>` renderer to override how any of them serialize, or to handle a same-named type of a different shape.

> **Note:** The `underline` renderer is included for Portable Text that uses it, but there's no standard Markdown syntax for underline, so it renders as HTML.

#### Configuring renderers

Provide custom renderers to control how Portable Text renders to Markdown.

**Custom type renderers:** Render custom block types (objects in the blocks array). A custom renderer under a default's name (see [Default renderers](#default-renderers)) replaces that default:

```ts
portableTextToMarkdown(blocks, {
  types: {
    // Render a custom "chart" block object
    chart: ({value}) => `![${value.title}](${value.imageUrl})`,
  },
})
```

**Custom block styles:** Override how block styles render:

```ts
portableTextToMarkdown(blocks, {
  block: {
    // Use ATX-style heading with closing hashes
    h1: ({children}) => `# ${children} #`,
    // Use HTML for blockquotes
    blockquote: ({children}) => `<blockquote>${children}</blockquote>`,
  },
})
```

**Built-in type renderers:** the library exports every built-in type renderer, in case you want to compose one into a different renderer or reuse it under a different type name. Two of them are exported but not registered by default: `DefaultBlockquoteObjectRenderer` and `DefaultListRenderer` render the structural container shapes (`types.blockquote`/`types.list` on the parser side) and stay opt-in, since the parser only produces those shapes when a matcher is registered for them:

```ts
import {
  DefaultBlockquoteObjectRenderer,
  DefaultListRenderer,
  portableTextToMarkdown,
} from '@portabletext/markdown'

portableTextToMarkdown(blocks, {
  types: {
    blockquote: DefaultBlockquoteObjectRenderer,
    list: DefaultListRenderer,
  },
})
```

| Renderer                          | Expected value                                         | Output                 |
| --------------------------------- | ------------------------------------------------------ | ---------------------- |
| `DefaultBlockquoteObjectRenderer` | `{content: PortableTextBlock[]}`                       | `> content`            |
| `DefaultCalloutRenderer`          | `{tone: string, content: PortableTextBlock[]}`         | `> [!TYPE]\n> content` |
| `DefaultCodeBlockRenderer`        | `{code: string, language?: string}`                    | ` ```lang\ncode\n``` ` |
| `DefaultHorizontalRuleRenderer`   | (no fields required)                                   | `---`                  |
| `DefaultHtmlRenderer`             | `{html: string}`                                       | Raw HTML               |
| `DefaultImageRenderer`            | `{src: string, alt?: string, title?: string}`          | `![alt](src "title")`  |
| `DefaultListRenderer`             | `{kind: 'bullet' \| 'number' \| 'task', items: [...]}` | Markdown list          |
| `DefaultTableRenderer`            | `{rows: [...], headerRows?: number}`                   | Markdown table         |

#### What renderers receive

One question decides which text field a renderer reads: **are you wrapping markdown, or emitting something else?** `children` is markdown: nested marks are rendered and literal punctuation is backslash-escaped, so it embeds in markdown output as-is (`` `**${children}**` ``). `text` is source: the raw span text exactly as stored, for renderers that emit their own delimiters or non-markdown output (code fences, HTML tags), where escapes would appear literally. The built-in `code` decorator renderer reads `text`; every other built-in reads `children`.

**Block renderers** (`block.*`):

- `value` – the block object
- `children` – rendered content of the block, as markdown (escaped)
- `index` – position in the blocks array

**Mark renderers** (`marks.*`):

- `value` – the mark definition (for annotations like links)
- `children` – the rendered marked content, as markdown (escaped)
- `text` – the raw text content (unescaped, no nested mark rendering)
- `markType` – the mark type name
- `markKey` – the mark's key (for annotations)

**Type renderers** (`types.*`):

- `value` – the typed object
- `index` – position in the blocks array
- `isInline` – whether it appears inline or as a block

Use `isInline` to handle block vs inline objects differently:

```ts
portableTextToMarkdown(blocks, {
  types: {
    image: ({value, isInline}) => {
      if (isInline) {
        // Skip inline images entirely by returning empty string
        return ''
      }
      // Render block images as full Markdown
      return `![${value.alt || ''}](${value.src})`
    },
  },
})
```

Return an empty string to skip rendering an element entirely.

**List item renderer** (`listItem`):

- `value` – the list item block
- `children` – rendered content
- `listIndex` – position in the list (for numbered lists)

#### Handling unknown types

The library provides fallback renderers for unknown content:

```ts
portableTextToMarkdown(blocks, {
  // Called for block types not in `types`
  unknownType: ({value}) => `<!-- Unknown type: ${value._type} -->`,

  // Called for block styles not in `block`
  unknownBlockStyle: ({value, children}) => children ?? '',

  // Called for list item types not in `listItem`
  unknownListItem: ({children}) => `- ${children}`,

  // Called for marks not in `marks`
  unknownMark: ({children}) => children,
})
```

By default, unknown types render as `json:object` fences or tagged code spans that round-trip (see [Round-trip behavior](#round-trip-behavior)), and unknown marks/styles pass through their children unchanged.

#### Gating default renderers on a schema

Going to convert the markdown back with `markdownToPortableText`? Pass the same `schema` to both, and nothing the schema can't rebuild becomes markdown that gets destroyed on the way back: undeclared types travel as `json:object` fences that reparse to the same value.

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'code',
        fields: [
          {name: 'code', type: 'string'},
          {name: 'language', type: 'string'},
        ],
      },
    ],
  }),
)

portableTextToMarkdown(blocks, {schema})
```

A default renderer (`callout`, `code`, `horizontal-rule`, `html`, `image`, `table`) runs only when the schema declares that type at the position the node appears in: `blockObjects` for a block, `inlineObjects` for an inline object. An `image` declared in only one of the two still falls back to `unknownType` at the other position.

The gate reads type names, never field values: declaring a type doesn't validate anything, and a value's fields play no part in which renderer runs. Fields matter on the parse side instead: `markdownToPortableText` filters a construct down to its declared fields, so declare each type with the fields its values carry, or the markdown forms this gate lets through come back rebuilt without them.

An undeclared type falls back to `unknownType`, whose default output is the same `json:object` fence or tagged code span described above, so it round-trips at block and inline positions. Inside a table cell the carrier uses its inline form (a GFM cell is one line), so an undeclared object in a cell survives too; declared types whose markdown form spans multiple lines (a code block in a cell) still flatten on reparse. Renderers you register in `types` bypass the gate entirely, whether or not the schema declares them.

Without a `schema`, every default renderer stays active.

#### Hard breaks

Customize how a hard break (a `\n` inside a span's text) renders:

```ts
portableTextToMarkdown(blocks, {
  // Render as HTML break instead of Markdown hard break
  hardBreak: () => '<br />\n',

  // Or render as plain newline (no trailing spaces)
  hardBreak: () => '\n',
})
```

#### Block spacing

By default, blocks are separated by double newlines (`\n\n`), with special handling for list items (single newline) and consecutive blockquotes. Customize with `blockSpacing`:

```ts
portableTextToMarkdown(blocks, {
  blockSpacing: ({current, next}) => {
    // Double newline between list items instead of single
    if (current.listItem && next.listItem) {
      return '\n\n'
    }
    // Return undefined to use default spacing
    return undefined
  },
})
```

### `applyMarkdownEdit`

Parsing markdown mints fresh `_key`s for text blocks (see [Round-trip behavior](#round-trip-behavior)), so converting a document to markdown, editing one word, and converting back returns what looks like a full rewrite: comment anchors detach, history churns, and granular patching is impossible. `applyMarkdownEdit` converts edited markdown back to Portable Text and restores stored `_key`s the way the same edit in an editor would have kept them:

```ts
import {applyMarkdownEdit, portableTextToMarkdown} from '@portabletext/markdown'

const stored = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    children: [{_type: 'span', _key: 's1', text: 'Ships tomorow.', marks: []}],
    markDefs: [],
  },
]

const markdown = portableTextToMarkdown(stored)
// markdown === 'Ships tomorow.'; an agent (or anything else) fixes the typo
const edited = applyMarkdownEdit(stored, 'Ships tomorrow.')
```

`edited`:

```json
[
  {
    "_type": "block",
    "_key": "b1",
    "style": "normal",
    "children": [
      {"_type": "span", "_key": "s1", "text": "Ships tomorrow.", "marks": []}
    ],
    "markDefs": []
  }
]
```

Keys follow the edit the way they would in an editor:

- Unchanged and moved blocks keep their keys, and repeated content pairs in order.
- Rewriting a block in place keeps its key, like typing over it. Style changes count as rewrites, and an edited table cell keeps the whole table's keys.
- Splitting a block keeps the key on the first non-empty fragment, like pressing enter; merging keeps the first block's key, like pressing backspace. A soft-wrap join is a merge.
- A typo fix lands as a text change on the same span, and editing a link's URL keeps its annotation key.
- When an insertion or deletion makes the match ambiguous, a block keeps its key only on clear evidence; everything else gets a new key.
- `json:object` payloads keep the `_key` they carry, unless the payload matches stored content, which keeps the stored key: editing markdown cannot re-key existing content.

Output keys are always unique among siblings, the inputs are never mutated, and the result is a value, not patches.

The options bag mirrors the two converters, plus a top-level `schema`: `deserialize` takes the rest of `markdownToPortableText`'s options and `serialize` takes the rest of `portableTextToMarkdown`'s. `schema` is taken once and governs both directions; restoring keys depends on the two serializations agreeing, and a mismatched dialect between them would otherwise reset keys document-wide. Pass the same `serialize` options that produced the markdown that was edited. The `deserialize` options apply to the stored value as well as the edited markdown, with two exceptions: new keys come from `deserialize.keyGenerator` (or the built-in generator), and `onDegradation` reports only on the edited markdown.

Some edits are indistinguishable without an operation log, and the function trades accordingly: replacing a block with unrelated content in the same position keeps its key (the end state is the same as a rewrite), and a whole-document rewrite that keeps the block count pairs blocks in order. When evidence runs out, keys reset instead: short blocks next to insertions or deletions get fresh keys, and on very large ambiguous edits evidence gathering is size- and time-capped, degrading to fresh keys rather than waiting (so near the caps, which keys survive can vary with machine speed).

`applyMarkdownEdit` restores identity, it does not merge concurrent edits. Reconcile against the exact value that produced the markdown, and before writing the result back, check that the stored field still equals that value. If it changed while the markdown was being edited, the edit describes a document that no longer exists, and writing it would silently overwrite the newer changes, restored keys included: serialize the current value and redo the edit instead.

## License

MIT © [Sanity.io](https://www.sanity.io/)
