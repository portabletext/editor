# @portabletext/test

Testing utilities for the Portable Text Editor.

## Terse PT

A compact syntax for writing Portable Text in tests, making test data more readable and maintainable.

### Parsing Terse PT

```ts
const tersePt = [
  'h1:Hello, world!',
  '{image}',
  '>-:Here are some unordered list items',
  '>-:With a nested ordered list:',
  '>>#:Ordered list item A',
  '>>#:Ordered list item B',
  'And here is a paragraph with an inline ,{stock-ticker},',
  'q:And a quote',
]

const blocks = parseTersePt(
  {
    schema: compileSchema(
      defineSchema({
        blockObjects: [{name: 'image'}],
        inlineObjects: [{name: 'stock-ticker'}],
        lists: [{name: 'bullet'}, {name: 'number'}],
        styles: [{name: 'h1'}, {name: 'blockquote'}],
      }),
    ),
    keyGenerator: createTestKeyGenerator(),
  },
  tersePt,
)
// [{_key: 'k0', _type: 'block', children: [...], style: 'h1'}, ...]
```

### Producing Terse PT

```ts
const blocks = [
  {
    _key: 'k0',
    _type: 'block',
    children: [{_key: 'k1', _type: 'span', text: 'foo'}],
  },
  {
    _key: 'k2',
    _type: 'block',
    children: [{_key: 'k3', _type: 'span', text: 'bar'}],
  },
]

const tersePt = getTersePt({
  schema: compileSchema(defineSchema({})),
  value: blocks,
})
// ['foo', 'bar']
```

## Key Generator

Generate predictable keys for test fixtures:

```ts
import {createTestKeyGenerator} from '@portabletext/test'

const keyGenerator = createTestKeyGenerator('test-')

keyGenerator() // 'test-k0'
keyGenerator() // 'test-k1'
keyGenerator() // 'test-k2'
```

## License

MIT © [Sanity.io](https://www.sanity.io/)
