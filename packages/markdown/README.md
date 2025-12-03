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
| Nested lists     | ✅                       | ✅                       |
| Code blocks      | ✅                       | ✅\*                     |
| Horizontal rules | ✅                       | ✅\*                     |
| Images           | ✅                       | ✅\*                     |
| Tables           | ✅\*                     | ✅\*                     |
| HTML blocks      | ✅                       | ✅\*                     |

\* Requires custom configuration (see usage below)

## Usage

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

| Type            | Values                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `styles`        | `'normal'`, `'h1'`, `'h2'`, `'h3'`, `'h4'`, `'h5'`, `'h6'`, `'blockquote'`                                                                                                                 |
| `lists`         | `'number'`, `'bullet'`                                                                                                                                                                     |
| `decorators`    | `'strong'`, `'em'`, `'code'`, `'strike-through'`                                                                                                                                           |
| `annotations`   | `'link'` (fields: `'href'`, `'title'`)                                                                                                                                                     |
| `blockObjects`  | `'code'` (fields: `'language'`, `'code'`), `'image'` (fields: `'src'`, `'alt'`, `'title'`), `'horizontal-rule'`, `'html'` (fields: `'html'`), `'table'` (fields: `'headerRows'`, `'rows'`) |
| `inlineObjects` | `'image'` (fields: `'src'`, `'alt'`, `'title'`)                                                                                                                                            |

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
| `marks`    | `strong`         | `**bold**`              | `'strong'`          |
|            | `em`             | `*italic*`              | `'em'`              |
|            | `code`           | `` `inline code` ``     | `'code'`            |
|            | `strikeThrough`  | `~~strikethrough~~`     | `'strike-through'`  |
|            | `link`           | `[text](url "title")`   | `'link'`            |
| `types`    | `code`           | Fenced code blocks      | `'code'`            |
|            | `horizontalRule` | `---`                   | `'horizontal-rule'` |
|            | `image`          | `![alt](src)`           | `'image'`           |
|            | `html`           | HTML blocks             | `'html'`            |

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

> **Note:** Checking if the type exists in the schema isn't required, but it's good practice. Returning `undefined` gracefully skips unsupported types.

**Table matcher:** Markdown tables are parsed but there's no default matcher. Provide one if your schema includes tables:

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

Matchers receive:

- `context.schema` – the compiled schema to validate against
- `context.keyGenerator` – function to generate unique keys
- `value` – the parsed Markdown data (structure depends on the matcher type)
- `isInline` – whether the element appears inline (for `ObjectMatcher` only)

Return `undefined` to skip the element (e.g., if the type isn't in the schema).

#### Default behavior for images and code

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

**Nested lists** are handled automatically. Each list item block includes a `level` property indicating its nesting depth (1 for top-level, 2 for nested, etc.).

**HTML blocks** (like `<div>...</div>`) become `'html'` block objects with the raw HTML in the `'html'` field. Inline HTML is controlled by the `html.inline` option.

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

| Group               | Renderer         | Renders                      | Output                |
| ------------------- | ---------------- | ---------------------------- | --------------------- |
| `block`             | `normal`         | Paragraphs                   | `{children}`          |
|                     | `h1`–`h6`        | Headings                     | `# `–`###### `        |
|                     | `blockquote`     | Blockquotes                  | `> {children}`        |
| `marks`             | `strong`         | Bold text                    | `**{children}**`      |
|                     | `em`             | Italic text                  | `_{children}_`        |
|                     | `code`           | Inline code                  | `` `{children}` ``    |
|                     | `underline`      | Underlined text              | `<u>{children}</u>`   |
|                     | `strike-through` | Strikethrough                | `~~{children}~~`      |
|                     | `link`           | Links                        | `[{children}](url)`   |
| `listItem`          |                  | List items (bullet & number) | `- ` or `1. `         |
| `hardBreak`         |                  | Line breaks within blocks    | `  \n` (two spaces)   |
| `blockSpacing`      |                  | Spacing between blocks       | `\n\n`, `\n`, `\n>\n` |
| `unknownType`       |                  | Unknown block types          | JSON code block       |
| `unknownBlockStyle` |                  | Unknown block styles         | `{children}`          |
| `unknownListItem`   |                  | Unknown list item types      | `- {children}`        |
| `unknownMark`       |                  | Unknown marks                | `{children}`          |

Unknown types render as JSON code blocks by default; unknown styles, list items, and marks pass through their children.

> **Note:** The `underline` renderer is included for Portable Text that uses it, but there's no standard Markdown syntax for underline, so it renders as HTML.

#### Configuring renderers

Provide custom renderers to control how Portable Text renders to Markdown.

**Custom type renderers:** Render custom block types (objects in the blocks array):

```ts
portableTextToMarkdown(blocks, {
  types: {
    callout: ({value}) => `> **${value.title}**\n> ${value.text}`,
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

**Built-in type renderers:** The library exports default renderers for common block types:

```ts
import {
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultHtmlRenderer,
  DefaultImageRenderer,
  DefaultTableRenderer,
  portableTextToMarkdown,
} from '@portabletext/markdown'

portableTextToMarkdown(blocks, {
  types: {
    'code': DefaultCodeBlockRenderer,
    'horizontal-rule': DefaultHorizontalRuleRenderer,
    'html': DefaultHtmlRenderer,
    'image': DefaultImageRenderer,
    'table': DefaultTableRenderer,
  },
})
```

| Renderer                        | Expected value                                | Output                 |
| ------------------------------- | --------------------------------------------- | ---------------------- |
| `DefaultCodeBlockRenderer`      | `{code: string, language?: string}`           | ` ```lang\ncode\n``` ` |
| `DefaultHorizontalRuleRenderer` | (no fields required)                          | `---`                  |
| `DefaultHtmlRenderer`           | `{html: string}`                              | Raw HTML               |
| `DefaultImageRenderer`          | `{src: string, alt?: string, title?: string}` | `![alt](src "title")`  |
| `DefaultTableRenderer`          | `{rows: [...], headerRows?: number}`          | Markdown table         |

#### What renderers receive

**Block renderers** (`block.*`):

- `value` – the block object
- `children` – rendered content of the block
- `index` – position in the blocks array

**Mark renderers** (`marks.*`):

- `value` – the mark definition (for annotations like links)
- `children` – the rendered marked content
- `text` – the raw text content (without nested mark rendering)
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

By default, unknown types render as JSON code blocks, and unknown marks/styles pass through their children unchanged.

You can also customize hard break rendering:

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

## License

MIT © [Sanity.io](https://www.sanity.io/)
