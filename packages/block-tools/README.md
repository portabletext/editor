# `@portabletext/block-tools`

> Convert HTML to Portable Text with built-in support for Google Docs, Word, and Notion.

**NOTE:** To use `@portabletext/block-tools` in a Node.js script, you will need to provide a `parseHtml` method - generally using `JSDOM`. [Read more](#jsdom-example).

## Example

### Using a Portable Text schema

```js
import {htmlToBlocks} from '@portabletext/block-tools'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
    styles: [
      {name: 'normal'},
      {name: 'h1'},
      {name: 'h2'},
      {name: 'h3'},
      {name: 'blockquote'},
    ],
    lists: [{name: 'bullet'}, {name: 'number'}],
  }),
)

const blocks = htmlToBlocks(
  '<html><body><h1>Hello world!</h1><body></html>',
  schema,
)
```

### Using a Sanity schema

If you have a Sanity schema, convert it first using `sanitySchemaToPortableTextSchema` from `@portabletext/sanity-bridge`:

```js
import {htmlToBlocks} from '@portabletext/block-tools'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'

const bodyType = sanitySchema
  .get('blogPost')
  .fields.find((field) => field.name === 'body').type

const blocks = htmlToBlocks(
  '<html><body><h1>Hello world!</h1><body></html>',
  sanitySchemaToPortableTextSchema(bodyType),
)
```

## Methods

### `htmlToBlocks(html, schema, options)` (html deserializer)

This will deserialize the input html (string) into blocks.

#### Params

##### `html`

The stringified version of the HTML you are importing

##### `schema`

A compiled `Schema` from `@portabletext/schema`.

The deserializer will respect the schema when deserializing the HTML elements to blocks.

It only supports a subset of HTML tags. Any HTML tag not in the block-tools [whitelist](https://github.com/portabletext/editor/blob/main/packages/block-tools/src/constants.ts) will be deserialized to normal blocks/spans.

For instance, if the schema doesn't allow H2 styles, all H2 HTML elements will be output like this:

```js
{
  _type: 'block',
  style: 'normal'
  children: [
    {
      _type: 'span'
      text: 'Hello world!'
    }
  ]
}
```

##### `options` (optional)

###### `parseHtml`

The HTML-deserialization is done by default by the browser's native DOMParser.
On the server side you can give the function `parseHtml`
that parses the html into a DOMParser compatible model / API.

###### JSDOM example

```js
const {JSDOM} = require('jsdom')
const {htmlToBlocks} = require('@portabletext/block-tools')
const {compileSchema, defineSchema} = require('@portabletext/schema')

const schema = compileSchema(defineSchema({...}))

const blocks = htmlToBlocks(
  '<html><body><h1>Hello world!</h1><body></html>',
  schema,
  {
    parseHtml: (html) => new JSDOM(html).window.document,
  },
)
```

##### `rules`

You may add your own rules to deal with special HTML cases.

```js
htmlToBlocks(
  '<html><body><pre><code>const foo = "bar"</code></pre></body></html>',
  schema,
  {
    parseHtml: (html) => new JSDOM(html),
    rules: [
      // Special rule for code blocks
      {
        deserialize(el, next, block) {
          if (el.tagName.toLowerCase() != 'pre') {
            return undefined
          }
          const code = el.children[0]
          const childNodes =
            code && code.tagName.toLowerCase() === 'code'
              ? code.childNodes
              : el.childNodes
          let text = ''
          childNodes.forEach((node) => {
            text += node.textContent
          })
          // Return this as an own block (via block helper function), instead of appending it to a default block's children
          return block({
            _type: 'code',
            language: 'javascript',
            text: text,
          })
        },
      },
    ],
  },
)
```

### `normalizeBlock(block, [options={}])`

Normalize a block object structure to make sure it has what it needs.

```js
import {normalizeBlock} from '@portabletext/block-tools'

const partialBlock = {
  _type: 'block',
  children: [
    {
      _type: 'span',
      text: 'Foobar',
      marks: ['strong', 'df324e2qwe'],
    },
  ],
}
normalizeBlock(partialBlock, {allowedDecorators: ['strong']})
```

Will produce

```
{
  _key: 'randomKey0',
  _type: 'block',
  children: [
    {
      _key: 'randomKey00',
      _type: 'span',
      marks: ['strong'],
      text: 'Foobar'
    }
  ],
  markDefs: []
}
```
