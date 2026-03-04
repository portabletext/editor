# `@portabletext/html`

> Convert HTML to Portable Text

> **Using Sanity?** [`@portabletext/block-tools`](../block-tools) wraps this package with Sanity schema support - use that if you already have a compiled Sanity schema.

## Installation

```bash
npm install @portabletext/html
```

## Quick start

```ts
import {htmlToPortableText} from '@portabletext/html'

const blocks = htmlToPortableText('<h1>Hello <strong>world</strong></h1>')
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

## Supported features

| Feature              | HTML to Portable Text |
| -------------------- | --------------------- |
| Headings (h1-h6)     | Yes                   |
| Paragraphs           | Yes                   |
| Bold                 | Yes                   |
| Italic               | Yes                   |
| Underline            | Yes                   |
| Strikethrough        | Yes                   |
| Inline code          | Yes                   |
| Links                | Yes                   |
| Blockquotes          | Yes                   |
| Ordered lists        | Yes                   |
| Unordered lists      | Yes                   |
| Nested lists         | Yes                   |
| Images               | Yes\*                 |
| Tables               | Yes\*                 |
| Google Docs paste    | Yes                   |
| Microsoft Word paste | Yes                   |
| Word Online paste    | Yes                   |
| Notion paste         | Yes                   |

\* Requires custom configuration (see usage below)

## Usage

### `htmlToPortableText`

```ts
import {htmlToPortableText} from '@portabletext/html'

const blocks = htmlToPortableText(`
  <h1>Hello World</h1>
  <p>This is <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>
  <ul>
    <li>First item</li>
    <li>Second item</li>
  </ul>
`)
```

### Custom schema

By default, `htmlToPortableText` uses a schema with common styles, decorators, and annotations. You can provide your own schema to control what types are produced:

```ts
import {htmlToPortableText} from '@portabletext/html'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}],
    annotations: [{name: 'link'}],
    blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
  }),
)

const blocks = htmlToPortableText(html, {schema})
```

### Custom rules

Rules give you full control over how HTML elements are converted to Portable Text. Custom rules are checked before the built-in rules - the first rule that returns a value wins.

```ts
import {htmlToPortableText} from '@portabletext/html'

const blocks = htmlToPortableText(html, {
  rules: [
    {
      deserialize(el, next, createBlock) {
        // Convert <pre><code> to a custom code block type
        if (el.tagName?.toLowerCase() !== 'pre') return undefined
        const code = el.querySelector('code')
        return createBlock({
          _type: 'code',
          text: (code ?? el).textContent ?? '',
          language: code?.className?.replace('language-', '') ?? undefined,
        })
      },
    },
  ],
})
```

### Whitespace handling

The `whitespaceMode` option controls how whitespace is handled during deserialization:

```ts
const blocks = htmlToPortableText(html, {
  whitespaceMode: 'normalize', // 'preserve' | 'remove' | 'normalize'
})
```

- `'preserve'` (default) - keep whitespace as-is
- `'remove'` - strip extra whitespace
- `'normalize'` - normalize whitespace (useful for Google Docs paste)

### HTML parsing

In the browser, `htmlToPortableText` uses the native `DOMParser`. In Node.js, you need to provide a parser:

```ts
import {htmlToPortableText} from '@portabletext/html'
import {JSDOM} from 'jsdom'

const blocks = htmlToPortableText(html, {
  parseHtml: (html) => new JSDOM(html).window.document,
})
```

### Image handling

Images require a custom matcher since there's no universal way to represent them in Portable Text. The `types.image` option receives an `ObjectMatcher` that's called for every `<img>` element:

```ts
import {htmlToPortableText, type ObjectMatcher} from '@portabletext/html'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
  }),
)

const imageMatcher: ObjectMatcher<{src?: string; alt?: string}> = ({
  context,
  value,
  isInline,
}) => {
  const collection = isInline
    ? context.schema.inlineObjects
    : context.schema.blockObjects

  if (!collection.some((obj) => obj.name === 'image')) {
    return undefined
  }

  return {
    _key: context.keyGenerator(),
    _type: 'image',
    ...(value.src ? {src: value.src} : {}),
  }
}

const blocks = htmlToPortableText(html, {
  schema,
  types: {image: imageMatcher},
})
```

The matcher is called with `isInline: false` for block-level images and `isInline: true` for inline images. Return `undefined` to skip the image.

### Table flattening

The `createFlattenTableRule` helper converts tables into a flat list of blocks:

```ts
import {htmlToPortableText} from '@portabletext/html'
import {createFlattenTableRule} from '@portabletext/html/rules'

const blocks = htmlToPortableText(html, {
  rules: [
    createFlattenTableRule({
      schema,
      separator: () => ({_type: 'span', text: ': '}),
    }),
  ],
})
```

### Key generation

By default, random keys are generated for each block and span. You can provide your own key generator for deterministic output:

```ts
let i = 0
const blocks = htmlToPortableText(html, {
  keyGenerator: () => `key${i++}`,
})
```

## Paste source support

The package includes built-in preprocessors that detect and handle paste from:

- **Google Docs** - handles inline styles, checkmark lists, and whitespace quirks
- **Microsoft Word** - handles mso-list CSS, heading styles, and list numbering
- **Word Online** - handles WACImage containers, TextRun formatting, and paragraph styles
- **Notion** - handles inline style formatting for single-block copies

These preprocessors run automatically - no configuration needed.

## License

MIT
