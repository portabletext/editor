import {compileSchema, defineSchema} from '@portabletext/schema'
import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EditorSelection} from '../src/types/editor'
import {fromTextspec, toTextspec} from './textspec'

const schema = compileSchema(
  defineSchema({
    annotations: [{name: 'comment'}, {name: 'link'}],
    decorators: [{name: 'em'}, {name: 'strong'}],
    blockObjects: [{name: 'image'}, {name: 'break'}],
    inlineObjects: [{name: 'stock-ticker'}],
    lists: [{name: 'bullet'}, {name: 'number'}],
    styles: [
      {name: 'normal'},
      {name: 'h1'},
      {name: 'h2'},
      {name: 'h3'},
      {name: 'h4'},
      {name: 'h5'},
      {name: 'h6'},
      {name: 'blockquote'},
    ],
  }),
)

function createKeyGenerator(): () => string {
  let counter = 0
  return () => {
    const key = `k${counter}`
    counter++
    return key
  }
}

describe(toTextspec.name, () => {
  test('simple paragraph', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'text', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    }

    expect(toTextspec({schema, value, selection})).toEqual('B: text|')
  })

  test('heading', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'heading', marks: []}],
        markDefs: [],
        style: 'h1',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B style="h1": heading|',
    )
  })

  test('list item', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'item', marks: []}],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B level=1 listItem="bullet": item|',
    )
  })

  test('decorator marks', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [
          {_key: 's1', _type: 'span', text: 'bold', marks: ['strong']},
          {_key: 's2', _type: 'span', text: ' text', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 5},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 5},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B: [strong:bold] text|',
    )
  })

  test('annotation marks', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'click', marks: ['a1']}],
        markDefs: [{_type: 'link', _key: 'a1', href: 'url'}],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 5},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 5},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B: [@link href="url":click]|',
    )
  })

  test('block object', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'image',
        _key: 'b1',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}], offset: 0},
      focus: {path: [{_key: 'b1'}], offset: 0},
    }

    expect(toTextspec({schema, value, selection})).toEqual('|{IMAGE}')
  })

  test('inline object', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [
          {_key: 's1', _type: 'span', text: 'text ', marks: []},
          {_key: 'io1', _type: 'stock-ticker'},
          {_key: 's2', _type: 'span', text: ' more', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 5},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 5},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B: text {stock-ticker} more|',
    )
  })

  test('multiple blocks', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_key: 's2', _type: 'span', text: 'second', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 6},
      focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 6},
    }

    expect(toTextspec({schema, value, selection})).toEqual(
      'B: first\nB: second|',
    )
  })

  test('single line mode', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'b2',
        children: [{_key: 's2', _type: 'span', text: 'second', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 6},
      focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 6},
    }

    expect(toTextspec({schema, value, selection}, {singleLine: true})).toEqual(
      'B: first;;B: second|',
    )
  })

  test('range selection', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'hello world', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const selection: EditorSelection = {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 5},
    }

    expect(toTextspec({schema, value, selection})).toEqual('B: ^hello| world')
  })

  test('no selection', () => {
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 's1', _type: 'span', text: 'text', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    expect(toTextspec({schema, value})).toEqual('B: text')
  })
})

describe(fromTextspec.name, () => {
  test('simple paragraph', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec({schema, keyGenerator}, 'B: text|')

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'text', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(result.selection).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
    })
  })

  test('heading', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec(
      {schema, keyGenerator},
      'B style="h1": heading|',
    )

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'heading', marks: []}],
        markDefs: [],
        style: 'h1',
      },
    ])
  })

  test('list item', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec(
      {schema, keyGenerator},
      'B listItem="bullet" level=1: item|',
    )

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'item', marks: []}],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('decorator marks', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec(
      {schema, keyGenerator},
      'B: [strong:bold] text|',
    )

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_key: 'k1', _type: 'span', text: 'bold', marks: ['strong']},
          {_key: 'k2', _type: 'span', text: ' text', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('annotation marks', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec(
      {schema, keyGenerator},
      'B: [@link href="url":click]|',
    )

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k2', _type: 'span', text: 'click', marks: ['k1']}],
        markDefs: [{_type: 'link', _key: 'k1', href: 'url'}],
        style: 'normal',
      },
    ])
  })

  test('block object', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec({schema, keyGenerator}, '{IMAGE}|')

    expect(result.blocks).toEqual([
      {
        _type: 'image',
        _key: 'k0',
      },
    ])

    expect(result.selection).toEqual({
      anchor: {path: [{_key: 'k0'}], offset: 1},
      focus: {path: [{_key: 'k0'}], offset: 1},
    })
  })

  test('inline object', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec(
      {schema, keyGenerator},
      'B: text {stock-ticker} more|',
    )

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_key: 'k1', _type: 'span', text: 'text ', marks: []},
          {_key: 'k2', _type: 'stock-ticker'},
          {_key: 'k3', _type: 'span', text: ' more', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('multiple blocks', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec({schema, keyGenerator}, 'B: first\nB: second|')

    expect(result.blocks).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'first', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [{_key: 'k3', _type: 'span', text: 'second', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('range selection', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec({schema, keyGenerator}, 'B: ^hello| world')

    expect(result.selection).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
    })
  })

  test('no selection', () => {
    const keyGenerator = createKeyGenerator()
    const result = fromTextspec({schema, keyGenerator}, 'B: text')

    expect(result.selection).toEqual(null)
  })
})

describe('roundtrip', () => {
  test('simple paragraph', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B: text|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('heading', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B style="h1": heading|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('list item', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B level=1 listItem="bullet": item|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('decorator marks', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B: [strong:bold] text|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('annotation marks', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B: [@link href="url":click]|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('multiple blocks', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B: first\nB: second|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('block object', () => {
    const keyGenerator = createKeyGenerator()
    const input = '{IMAGE}|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })

  test('inline object', () => {
    const keyGenerator = createKeyGenerator()
    const input = 'B: text {stock-ticker} more|'
    const {blocks, selection} = fromTextspec({schema, keyGenerator}, input)
    const output = toTextspec({schema, value: blocks, selection})
    expect(output).toEqual(input)
  })
})
