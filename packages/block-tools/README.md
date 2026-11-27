# `@portabletext/block-tools`

> Sanity-flavored HTML to Portable Text conversion

This package wraps [`@portabletext/html`](../html) for use with Sanity schemas. If you're not using Sanity's schema system, use `@portabletext/html` directly - it has the same features with a simpler API.

## When to use which

| Package                     | Use when                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `@portabletext/html`        | Standalone projects, custom schemas, or any non-Sanity context  |
| `@portabletext/block-tools` | Sanity projects where you already have a compiled Sanity schema |

## Usage

```ts nocheck
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

Whitespace handling and image matchers use different option names here than in `@portabletext/html`:

- `unstable_whitespaceOnPasteMode` (`'preserve' | 'remove' | 'normalize'`) instead of `whitespaceMode`.
- `matchers.image` for block-level images and `matchers.inlineImage` for inline images, instead of a single `types.image`. Both are called with `{context, props}`, where `props` holds the `<img>` element's attributes (including `src` and `alt`), instead of `{context, value, isInline}`.

**NOTE:** To use in Node.js, you need to provide a `parseHtml` option - generally using `JSDOM`:

```ts nocheck
import {htmlToBlocks} from '@portabletext/block-tools'
import {JSDOM} from 'jsdom'

const blocks = htmlToBlocks(html, blockContentType, {
  parseHtml: (html) => new JSDOM(html).window.document,
})
```

### Rules from `@portabletext/block-tools/rules`

The `@portabletext/block-tools/rules` subpath re-exports the table rules from `@portabletext/html/rules`: `createTableRule`, `createFlattenTableRule` and the `TableRuleContainers` type. They return rules that can be passed to the `rules` option of `htmlToBlocks`. Both take a `@portabletext/schema` `Schema`, not a compiled Sanity schema type. See [Table flattening](../html/README.md#table-flattening) and [Table deserialization](../html/README.md#table-deserialization) in the `@portabletext/html` README for their options and output.

```ts nocheck
import {htmlToBlocks} from '@portabletext/block-tools'
import {createTableRule} from '@portabletext/block-tools/rules'

const blocks = htmlToBlocks(html, blockContentType, {
  rules: [createTableRule({schema})],
})
```

### `normalizeBlock(block, options?)`

Normalize a block to ensure it has a `_key`. A text block also gets `children` and `markDefs`, and its children get new keys.

```ts
import {normalizeBlock} from '@portabletext/block-tools'

const block = {
  _type: 'block',
  children: [{_type: 'span', text: 'Hello', marks: ['strong']}],
}

const normalized = normalizeBlock(block)
// => { _key: '...', _type: 'block', children: [{ _key: '...', _type: 'span', text: 'Hello', marks: ['strong'] }], markDefs: [] }
```

Options (`BlockNormalizationOptions`):

- `allowedDecorators` (`string[]`, default `undefined`): when set, span marks that are neither listed here nor the `_key` of one of the block's `markDefs` are removed. When omitted, decorators are left alone.
- `blockTypeName` (`string`, default `'block'`): the `_type` of text blocks. A block of any other type only gets a `_key` if it lacks one.
- `keyGenerator` (`() => string`, default random keys): generates the keys added to the block and its children.

## License

MIT
