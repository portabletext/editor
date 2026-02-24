# `@portabletext/html`

> Convert HTML to Portable Text

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

| HTML element               | Portable Text output               |
| -------------------------- | ---------------------------------- |
| `<p>`                      | Block with `'normal'` style        |
| `<h1>` – `<h6>`            | Block with `'h1'`–`'h6'` style     |
| `<blockquote>`             | Block with `'blockquote'` style    |
| `<ul>` / `<li>`            | Block with `'bullet'` list item    |
| `<ol>` / `<li>`            | Block with `'number'` list item    |
| Nested lists               | List items with increasing `level` |
| `<strong>`, `<b>`          | `'strong'` decorator               |
| `<em>`, `<i>`              | `'em'` decorator                   |
| `<code>`                   | `'code'` decorator                 |
| `<u>`                      | `'underline'` decorator            |
| `<s>`, `<strike>`, `<del>` | `'strike-through'` decorator       |
| `<a href="...">`           | `'link'` annotation                |
| `<img>` (standalone)       | `'image'` block object             |
| `<img>` (inline)           | `'image'` inline object            |
| `<br>`                     | Line break within block            |

The library also handles paste content from **Google Docs**, **Microsoft Word**, **Word Online**, and **Notion** with built-in preprocessors that normalize their HTML output before conversion.

## Schema configuration

The default schema includes the following definitions:

| Type            | Values                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| `styles`        | `'normal'`, `'h1'`, `'h2'`, `'h3'`, `'h4'`, `'h5'`, `'h6'`, `'blockquote'` |
| `lists`         | `'number'`, `'bullet'`                                                     |
| `decorators`    | `'strong'`, `'em'`, `'code'`, `'underline'`, `'strike-through'`            |
| `annotations`   | `'link'` (fields: `'href'`)                                                |
| `blockObjects`  | `'image'` (fields: `'src'`, `'alt'`)                                       |
| `inlineObjects` | `'image'` (fields: `'src'`, `'alt'`)                                       |

To use a custom schema, import `compileSchema` and `defineSchema` from `@portabletext/schema`:

```ts
import {htmlToPortableText} from '@portabletext/html'
import {compileSchema, defineSchema} from '@portabletext/schema'

const blocks = htmlToPortableText(html, {
  schema: compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
  ),
})
```

To use a Sanity schema, convert it with `@portabletext/sanity-bridge`:

```ts
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'

const schema = sanitySchemaToPortableTextSchema(sanityBlockArraySchema)

htmlToPortableText(html, {schema})
```

## Custom rules

Rules let you override how specific HTML elements are converted to Portable Text. Each rule has a `deserialize` function that receives a DOM node and returns Portable Text objects (or `undefined` to skip).

Rules are checked in order. The first rule that returns a value wins. Custom rules run before the built-in rules, so they can override default behavior.

```ts
htmlToPortableText(html, {
  rules: [
    {
      deserialize(node, next, createBlock) {
        // Only handle <figure> elements
        if (
          node instanceof HTMLElement &&
          node.tagName.toLowerCase() === 'figure'
        ) {
          const img = node.querySelector('img')
          const caption = node.querySelector('figcaption')

          if (img) {
            const {block} = createBlock({_type: 'image'})
            return {
              ...block,
              src: img.getAttribute('src') ?? '',
              alt: img.getAttribute('alt') ?? '',
              caption: caption?.textContent ?? '',
            }
          }
        }

        // Return undefined to let other rules handle this element
        return undefined
      },
    },
  ],
})
```

Rules receive:

- `node` – the DOM `Node` being processed (check `instanceof HTMLElement` for element-specific handling)
- `next` – function to recursively deserialize child nodes
- `createBlock` – helper to create a block wrapper (returns `{_type, block}` with a generated `_key`)

### Built-in rules

Import pre-built rules from the `@portabletext/html/rules` subpath:

```ts
import {createFlattenTableRule} from '@portabletext/html/rules'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(
  defineSchema({
    /* ... */
  }),
)

htmlToPortableText(html, {
  schema,
  rules: [
    createFlattenTableRule({
      schema,
      separator: () => ({_type: 'span', text: ': ', marks: []}),
    }),
  ],
})
```

| Rule                     | Description                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `createFlattenTableRule` | Converts HTML tables to flat blocks, pairing each cell with its column header. `@beta` |

### Image matchers

For finer control over how `<img>` elements map to your schema, use the `matchers` option:

```ts
htmlToPortableText(html, {
  matchers: {
    image: ({context, props}) => {
      const imageType = context.schema.blockObjects.find(
        (obj) => obj.name === 'photo',
      )
      if (!imageType) return undefined

      return {
        _type: 'photo',
        _key: context.keyGenerator(),
        url: props.src ?? '',
        description: props.alt ?? '',
      }
    },
    inlineImage: ({context, props}) => {
      const imageType = context.schema.inlineObjects.find(
        (obj) => obj.name === 'photo',
      )
      if (!imageType) return undefined

      return {
        _type: 'photo',
        _key: context.keyGenerator(),
        url: props.src ?? '',
        description: props.alt ?? '',
      }
    },
  },
})
```

Matchers receive:

- `context.schema` – the compiled schema
- `context.keyGenerator` – function to generate unique keys
- `props` – the `<img>` element's attributes (`src`, `alt`, etc.)

Return `undefined` to skip the element.

## Options

```ts
htmlToPortableText(html, {
  // Custom schema (defaults to built-in schema)
  schema: mySchema,

  // Custom key generator for blocks and spans
  keyGenerator: () => nanoid(),

  // Whitespace handling: 'preserve' | 'remove' | 'normalize'
  // Default: 'preserve'
  whitespace: 'remove',

  // Custom HTML parser (defaults to DOMParser in browsers, jsdom in Node.js)
  parseHtml: (html) => new DOMParser().parseFromString(html, 'text/html'),

  // Custom rules (checked before built-in rules)
  rules: [
    /* ... */
  ],

  // Custom image matchers (@beta)
  matchers: {
    /* ... */
  },
})
```

## License

MIT © [Sanity.io](https://www.sanity.io/)
