import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {getTersePt, parseTersePt, parseTersePtString} from './terse-pt'
import {createTestKeyGenerator} from './test-key-generator'

const keyGenerator = createTestKeyGenerator()

describe(getTersePt.name, () => {
  test('basic cases', () => {
    const schema = compileSchema(defineSchema({}))
    const fooBlock = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'foo'}],
    }
    const emptyBlock = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: ''}],
    }
    const barBlock = {
      _key: 'b3',
      _type: 'block',
      children: [{_key: 's3', _type: 'span', text: 'bar'}],
    }
    const softReturnBlock = {
      _key: 'b4',
      _type: 'block',
      children: [{_key: 's4', _type: 'span', text: 'foo\nbar'}],
    }

    expect(getTersePt({schema, value: [fooBlock, barBlock]})).toEqual([
      'foo',
      'bar',
    ])
    expect(getTersePt({schema, value: [emptyBlock, barBlock]})).toEqual([
      '',
      'bar',
    ])
    expect(
      getTersePt({schema, value: [fooBlock, emptyBlock, barBlock]}),
    ).toEqual(['foo', '', 'bar'])
    expect(getTersePt({schema, value: [fooBlock, softReturnBlock]})).toEqual([
      'foo',
      'foo\nbar',
    ])

    expect(
      getTersePt({
        schema,
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
          },
        ],
      }),
    ).toEqual(['foo'])
    expect(
      getTersePt({
        schema,
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
            listItem: 'number',
          },
        ],
      }),
    ).toEqual(['#:foo'])
    expect(
      getTersePt({
        schema,
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
            listItem: 'number',
            style: 'h3',
          },
        ],
      }),
    ).toEqual(['#h3:foo'])
    expect(
      getTersePt({
        schema,
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
            level: 2,
            listItem: 'number',
            style: 'h3',
          },
        ],
      }),
    ).toEqual(['>>#h3:foo'])
    expect(
      getTersePt({
        schema,
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
            style: 'h3',
          },
        ],
      }),
    ).toEqual(['h3:foo'])
  })

  describe('extended example', () => {
    const tersePt = [
      'h1:Hello world!',
      '{image}',
      '>-:Here are some unordered list items',
      '>-:With a nested ordered list:',
      '>>#:Ordered list item A',
      '>>#:Ordered list item B',
      'And here is a paragraph with an inline ,{stock-ticker},',
      'q:And a quote',
    ]

    test('no schema', () => {
      const schema = compileSchema(defineSchema({}))
      const blocks = parseTersePt(
        {
          schema,
          keyGenerator: createTestKeyGenerator(),
        },
        tersePt,
      )

      expect(getTersePt({schema, value: blocks})).toEqual([
        'Hello world!',
        '>:Here are some unordered list items',
        '>:With a nested ordered list:',
        '>>:Ordered list item A',
        '>>:Ordered list item B',
        'And here is a paragraph with an inline ,',
        'And a quote',
      ])
    })

    test('with schema', () => {
      const schema = compileSchema(
        defineSchema({
          blockObjects: [{name: 'image'}],
          inlineObjects: [{name: 'stock-ticker'}],
          lists: [{name: 'bullet'}, {name: 'number'}],
          styles: [{name: 'h1'}, {name: 'blockquote'}],
        }),
      )
      const blocks = parseTersePt(
        {schema, keyGenerator: createTestKeyGenerator()},
        tersePt,
      )

      expect(getTersePt({schema, value: blocks})).toEqual(tersePt)
    })
  })
})

test(parseTersePtString.name, () => {
  expect(parseTersePtString('foo')).toEqual(['foo'])
  expect(parseTersePtString('foo,bar')).toEqual(['foo,bar'])
  expect(parseTersePtString('foo,bar|baz')).toEqual(['foo,bar', 'baz'])
  expect(parseTersePtString('|foo')).toEqual(['', 'foo'])
  expect(parseTersePtString('foo|')).toEqual(['foo', ''])
  expect(parseTersePtString('foo|bar\nbaz')).toEqual(['foo', 'bar\nbaz'])
  expect(parseTersePtString('f,oo||ba,r')).toEqual(['f,oo', '', 'ba,r'])
  expect(parseTersePtString('|')).toEqual(['', ''])
  expect(parseTersePtString('||')).toEqual(['', '', ''])
  expect(parseTersePtString('>>#h3:foo')).toEqual(['>>#h3:foo'])
  expect(parseTersePtString(':')).toEqual([':'])
})

describe(parseTersePt.name, () => {
  test('empty list', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(
            defineSchema({
              lists: [{name: 'bullet'}],
            }),
          ),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString('-:'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
          },
        ],
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('just a colon', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(defineSchema({})),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString(':'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: ':',
          },
        ],
      },
    ])
  })

  test('colon followed by content', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(defineSchema({})),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString(':foo'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: ':foo'}],
      },
    ])
  })

  test('unknown style', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(defineSchema({})),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString('h1:foo'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo'}],
      },
    ])
  })

  test('colon in content', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(
            defineSchema({
              styles: [{name: 'h1'}],
            }),
          ),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString('h1:foo:bar'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo:bar'}],
        style: 'h1',
      },
    ])
  })

  test('unknown inline object', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(defineSchema({})),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString('foo ,{stock-ticker}, bar'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {_key: 'k1', _type: 'span', text: 'foo '},
          {_key: 'k2', _type: 'span', text: ' bar'},
        ],
      },
    ])
  })

  test('extended example', () => {
    expect(
      parseTersePt(
        {
          schema: compileSchema(
            defineSchema({
              blockObjects: [{name: 'image'}],
              inlineObjects: [{name: 'stock-ticker'}],
              lists: [{name: 'bullet'}, {name: 'number'}],
              styles: [{name: 'h4'}],
            }),
          ),
          keyGenerator: createTestKeyGenerator(),
        },
        parseTersePtString('{image}|foo|>>#h4:bar|-:baz,fizz|,{stock-ticker},'),
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'image',
      },
      {
        _key: 'k1',
        _type: 'block',
        children: [{_key: 'k2', _type: 'span', text: 'foo'}],
      },
      {
        _key: 'k3',
        _type: 'block',
        children: [{_key: 'k4', _type: 'span', text: 'bar'}],
        level: 2,
        listItem: 'number',
        style: 'h4',
      },
      {
        _key: 'k5',
        _type: 'block',
        children: [
          {_key: 'k6', _type: 'span', text: 'baz'},
          {_key: 'k7', _type: 'span', text: 'fizz'},
        ],
        listItem: 'bullet',
        level: 1,
      },
      {
        _key: 'k8',
        _type: 'block',
        children: [
          {_key: 'k9', _type: 'span', text: ''},
          {_key: 'k10', _type: 'stock-ticker'},
          {_key: 'k11', _type: 'span', text: ''},
        ],
      },
    ])
  })

  test('extended example #2', () => {
    const tersePt = [
      'h1:Hello world!',
      '{image}',
      '>-:Here are some unordered list items',
      '>-:With a nested ordered list:',
      '>>#:Ordered list item A',
      '>>#:Ordered list item B',
      'And here is a paragraph with an inline ,{stock-ticker},',
      'q:And a quote',
    ]

    expect(
      parseTersePt(
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
      ),
    ).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'Hello world!'}],
        style: 'h1',
      },
      {
        _key: 'k2',
        _type: 'image',
      },
      {
        _key: 'k3',
        _type: 'block',
        children: [
          {
            _key: 'k4',
            _type: 'span',
            text: 'Here are some unordered list items',
          },
        ],
        listItem: 'bullet',
        level: 1,
      },
      {
        _key: 'k5',
        _type: 'block',
        children: [
          {_key: 'k6', _type: 'span', text: 'With a nested ordered list:'},
        ],
        listItem: 'bullet',
        level: 1,
      },
      {
        _key: 'k7',
        _type: 'block',
        children: [{_key: 'k8', _type: 'span', text: 'Ordered list item A'}],
        level: 2,
        listItem: 'number',
      },
      {
        _key: 'k9',
        _type: 'block',
        children: [{_key: 'k10', _type: 'span', text: 'Ordered list item B'}],
        level: 2,
        listItem: 'number',
      },
      {
        _key: 'k11',
        _type: 'block',
        children: [
          {
            _key: 'k12',
            _type: 'span',
            text: 'And here is a paragraph with an inline ',
          },
          {_key: 'k13', _type: 'stock-ticker'},
          {_key: 'k14', _type: 'span', text: ''},
        ],
      },
      {
        _key: 'k15',
        _type: 'block',
        children: [{_key: 'k16', _type: 'span', text: 'And a quote'}],
        style: 'blockquote',
      },
    ])
  })
})
