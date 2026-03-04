# `@portabletext/block-tools`

> Sanity-flavored HTML to Portable Text conversion

This package wraps [`@portabletext/html`](../html) for use with Sanity schemas. If you're not using Sanity's schema system, use `@portabletext/html` directly - it has the same features with a simpler API.

## When to use which

| Package                      | Use when                                                         |
| ---------------------------- | ---------------------------------------------------------------- |
| `@portabletext/html`         | Standalone projects, custom schemas, or any non-Sanity context   |
| `@portabletext/block-tools`  | Sanity projects where you already have a compiled Sanity schema  |

## Usage

```ts
import {htmlToBlocks} from '@portabletext/block-tools'
import {Schema} from '@sanity/schema'

const defaultSchema = Schema.compile({
  name: 'myBlog',
  types: [
    {
      type: 'object',
      name: 'blogPost',
      fields: [
        {
          title: 'Title',
          type: 'string',
          name: 'title',
        },
        {
          title: 'Body',
          name: 'body',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const blockContentType = defaultSchema
  .get('blogPost')
  .fields.find((field) => field.name === 'body').type

const blocks = htmlToBlocks(
  '<html><body><h1>Hello world!</h1></body></html>',
  blockContentType,
)
```

### `htmlToBlocks(html, blockContentType, options?)`

Converts HTML to Portable Text blocks using a Sanity block content schema type.

Internally delegates to `@portabletext/html` after converting the Sanity schema. Supports the same `parseHtml`, `rules`, and `keyGenerator` options. See the [`@portabletext/html` README](../html/README.md) for full documentation on rules, whitespace handling, image matchers, and paste source support.

**NOTE:** To use in Node.js, you need to provide a `parseHtml` option - generally using `JSDOM`:

```ts
import {JSDOM} from 'jsdom'

const blocks = htmlToBlocks(html, blockContentType, {
  parseHtml: (html) => new JSDOM(html).window.document,
})
```

### `normalizeBlock(block, options?)`

Normalize a block object structure to ensure it has `_key`, `_type`, `children`, and `markDefs`.

```ts
import {normalizeBlock} from '@portabletext/block-tools'

const normalized = normalizeBlock({
  _type: 'block',
  children: [{_type: 'span', text: 'Hello', marks: ['strong']}],
})
// => { _key: '...', _type: 'block', children: [{ _key: '...', _type: 'span', text: 'Hello', marks: ['strong'] }], markDefs: [] }
```

## License

MIT
