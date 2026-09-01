# `@portabletext/test`

Testing utilities for the Portable Text Editor.

## Installation

```sh
npm install --save-dev @portabletext/test
```

## Terse PT

A compact syntax for writing Portable Text in tests, making test data more readable and maintainable.

### Parsing Terse PT

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, parseTersePt} from '@portabletext/test'

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
import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'

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

## Textspec

[Textspec notation](https://github.com/textspec/textspec) is a richer sibling of Terse PT that also carries marks and selection markers (`|` caret, `^...|` range).

### Parsing textspec notation

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, fromTextspec} from '@portabletext/test'

const {blocks, selection} = fromTextspec(
  {
    schema: compileSchema(defineSchema({decorators: [{name: 'strong'}]})),
    keyGenerator: createTestKeyGenerator(),
  },
  'B: foo [strong:bar] b|az',
)
// blocks: one text block with spans 'foo ', 'bar' (strong), ' baz'
// selection: caret between 'b' and 'az' in the last span
```

Pass an optional `containers` map (see `TextspecContainers`) to resolve container schemas. `selectionFromTextspec` resolves a pattern's selection markers against an existing Portable Text value, for placing a selection in an editor that already has content.

### Producing textspec notation

`toTextspec` is the inverse: serialize Portable Text blocks and a selection back into notation.

```ts
import {toTextspec} from '@portabletext/test'

const notation = toTextspec({schema, value: blocks, selection})
// 'B: foo [strong:bar] b|az'
```

## Key generator

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
