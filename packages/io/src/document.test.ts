import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {
  comparableTextspec,
  createDocument,
  createsBlock,
  emptiesField,
  formatTextspec,
  parseTextspec,
} from './document'

describe(parseTextspec.name, () => {
  test('reads blocks, styles and the caret', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(parseTextspec({keyGenerator}, 'B: foo;;H1: ba|r')).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'h1',
        },
      ],
      caret: {blockKey: 'k2', offset: 2},
    })
  })

  test('reads named keys and no caret', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(parseTextspec({keyGenerator}, 'B _key="k9": baz')).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k9',
          children: [{_type: 'span', _key: 'k0', text: 'baz', marks: []}],
          style: 'normal',
        },
      ],
      caret: undefined,
    })
  })
})

describe(createDocument.name, () => {
  test('writes back the notation it was built from', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;H2: ba|r;;H1: '),
    )

    expect(document.toTextspec()).toEqual('B: foo;;H2: ba|r;;H1: ')
  })

  test('writes keys on request', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="k9": baz;;H1: fo|o'),
    )

    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k9": baz;;H1 _key="k1": fo|o',
    )
  })

  test('puts the caret at the start of the first block when none is given', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      {value: parseTextspec({keyGenerator}, 'B: foo;;B: bar').value},
    )

    expect(document.getCaret()).toEqual({blockKey: 'k0', offset: 0})
    expect(document.toTextspec()).toEqual('B: |foo;;B: bar')
  })

  test('setting a style sets it on the caret block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r'),
    )
    const before = document.getValue()

    const result = document.setStyle('h1')

    expect(result).toEqual({
      patches: [set('h1', [{_key: 'k2'}, 'style'])],
      undoStep: {type: 'styled', blockKey: 'k2', style: 'h1'},
    })
    expect(document.toTextspec()).toEqual('B: foo;;H1: ba|r')
    expect(applyAll(before, result.patches)).toEqual(document.getValue())
  })

  test('setting an unknown style throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )

    expect(() => document.setStyle('h9')).toThrow('Unknown style "h9"')
  })

  test('typing inserts at the caret and sends a text diff', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )
    const before = document.getValue()

    const result = document.type('xy')

    expect(result).toEqual({
      patches: [
        diffMatchPatch('foo', 'foxyo', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ],
      undoStep: {
        type: 'typed',
        blockKey: 'k0',
        spanKey: 'k1',
        offset: 2,
        text: 'xy',
      },
    })
    expect(document.toTextspec()).toEqual('B: foxy|o;;B: bar')
    expect(applyAll(before, result.patches)).toEqual(document.getValue())
  })

  test('the caret is put after text found in one block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: bar'),
    )

    document.putCaretAfter('ba')

    expect(document.getCaret()).toEqual({blockKey: 'k2', offset: 2})
    expect(document.toTextspec()).toEqual('B: foo;;B: ba|r')
  })

  test('putting the caret after ambiguous or missing text throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: foobar;;B: baba'),
    )

    expect(() => document.putCaretAfter('foo')).toThrow(
      'Expected "foo" to occur once, found it 2 times',
    )
    expect(() => document.putCaretAfter('ba')).toThrow(
      'Expected "ba" to occur once, found it 3 times',
    )
    expect(() => document.putCaretAfter('baz')).toThrow(
      'Expected "baz" to occur once, found it 0 times',
    )
  })

  test('an inserted block keeps its named key and goes after the caret block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: bar'),
    )
    const before = document.getValue()

    const result = document.insertBlock('B _key="k9": baz')

    expect(result).toEqual({
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: 'k9',
              children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              style: 'normal',
            },
          ],
          'after',
          [{_key: 'k0'}],
        ),
      ],
      undoStep: {type: 'inserted', blockKey: 'k9'},
    })
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k0": foo;;B _key="k9": baz|;;B _key="k2": bar',
    )
    expect(applyAll(before, result.patches)).toEqual(document.getValue())
  })

  test('an inserted block without a named key gets a generated one', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )

    const result = document.insertBlock('H2: baz')

    expect(result).toEqual({
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'baz', marks: []}],
              style: 'h2',
            },
          ],
          'after',
          [{_key: 'k0'}],
        ),
      ],
      undoStep: {type: 'inserted', blockKey: 'k2'},
    })
    expect(document.toTextspec()).toEqual('B: foo;;H2: baz|')
  })

  test('deleting the caret block moves the caret to the end of the previous block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r;;B: baz'),
    )
    const before = document.getValue()

    const result = document.deleteBlock('bar')

    expect(result).toEqual({
      patches: [unset([{_key: 'k2'}])],
      undoStep: {
        type: 'deleted',
        block: {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
        },
        previousKey: 'k0',
        nextKey: 'k4',
      },
    })
    expect(document.toTextspec()).toEqual('B: foo|;;B: baz')
    expect(applyAll(before, result.patches)).toEqual(document.getValue())
  })

  test('deleting the first block records that it had no previous sibling', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )
    const before = document.getValue()

    const result = document.deleteBlock('foo')

    expect(result).toEqual({
      patches: [unset([{_key: 'k0'}])],
      undoStep: {
        type: 'deleted',
        block: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
        previousKey: undefined,
        nextKey: 'k2',
      },
    })
    expect(document.toTextspec()).toEqual('B: |bar')
    expect(applyAll(before, result.patches)).toEqual(document.getValue())
  })

  test('deleting another block leaves the caret where it is', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )

    document.deleteBlock('bar')

    expect(document.toTextspec()).toEqual('B: fo|o')
  })

  test('deleting a block with ambiguous or missing text throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: foo'),
    )

    expect(() => document.deleteBlock('foo')).toThrow(
      'Expected one block with the text "foo", found 2',
    )
    expect(() => document.deleteBlock('bar')).toThrow(
      'Expected one block with the text "bar", found 0',
    )
  })

  test('an inserted block whose key a sibling has gets a new key', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="k9": foo|'),
    )

    const result = document.insertBlock('B _key="k9": bar')

    expect(result).toEqual({
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
              style: 'normal',
            },
          ],
          'after',
          [{_key: 'k9'}],
        ),
      ],
      undoStep: {type: 'inserted', blockKey: 'k2'},
    })
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k9": foo;;B _key="k2": bar|',
    )
  })

  test('new content keeps the caret in its block, clamped to the text', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: bar|'),
    )

    document.setValue(
      parseTextspec({keyGenerator}, 'B _key="k0": foox;;B _key="k2": b').value,
    )

    expect(document.toTextspec()).toEqual('B: foox;;B: b|')
  })

  test('new content without the caret block puts the caret at the start', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: bar|'),
    )

    document.setValue(parseTextspec({keyGenerator}, 'B _key="k0": foo').value)

    expect(document.toTextspec()).toEqual('B: |foo')
  })
})

describe('reverting a change', () => {
  test('typed text is deleted while its span still holds it, and the caret moves back', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fooxy|'),
    )
    const typed = {
      type: 'typed' as const,
      blockKey: 'k0',
      spanKey: 'k1',
      offset: 3,
      text: 'x',
    }

    expect(document.deleteText(typed)).toEqual([
      diffMatchPatch('fooxy', 'fooy', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
    ])
    expect(document.toTextspec()).toEqual('B: fooy|')
    expect(document.deleteText(typed)).toEqual([])
    expect(document.deleteText({...typed, spanKey: 'k8'})).toEqual([])
    expect(document.deleteText({...typed, blockKey: 'k9'})).toEqual([])
    expect(document.toTextspec()).toEqual('B: fooy|')
  })

  test("a block's style is set or removed, and a gone block is left alone", () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'H1: foo|'),
    )

    expect(document.setBlockStyle('k0', 'h2')).toEqual([
      set('h2', [{_key: 'k0'}, 'style']),
    ])
    expect(document.setBlockStyle('k0', undefined)).toEqual([
      unset([{_key: 'k0'}, 'style']),
    ])
    expect(document.getValue()).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
    expect(document.setBlockStyle('k9', 'h1')).toEqual([])
  })

  test('a block deleted by key empties the field when it was the last, and a gone block is left alone', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: bar'),
    )

    expect(document.deleteBlockByKey('k9')).toEqual([])
    expect(document.deleteBlockByKey('k2')).toEqual([unset([{_key: 'k2'}])])
    expect(document.deleteBlockByKey('k0')).toEqual([
      unset([{_key: 'k0'}]),
      unset([]),
    ])
    expect(document.getPlaceholderKey()).toEqual('k4')
  })

  test('a deleted block goes back after its previous sibling, else before its next one, else first', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;B: bar;;B: baz')
    const [fooBlock, barBlock, bazBlock] = value
    const document = createDocument({keyGenerator}, {value: [bazBlock]})

    expect(
      document.restoreBlock({
        type: 'deleted',
        block: barBlock,
        previousKey: fooBlock._key,
        nextKey: bazBlock._key,
      }),
    ).toEqual([insert([barBlock], 'before', [{_key: bazBlock._key}])])
    expect(
      document.restoreBlock({
        type: 'deleted',
        block: fooBlock,
        previousKey: 'k9',
        nextKey: 'k8',
      }),
    ).toEqual([insert([fooBlock], 'before', [{_key: barBlock._key}])])
    expect(document.toTextspec()).toEqual('B: foo;;B: bar;;B: |baz')

    document.deleteBlockByKey(bazBlock._key)

    expect(
      document.restoreBlock({
        type: 'deleted',
        block: bazBlock,
        previousKey: barBlock._key,
        nextKey: undefined,
      }),
    ).toEqual([insert([bazBlock], 'after', [{_key: barBlock._key}])])
    expect(document.toTextspec()).toEqual('B: foo;;B: bar|;;B: baz')
  })

  test('a deleted block is not put back while its key is on screen', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo|;;B: bar')
    const document = createDocument({keyGenerator}, {value})

    expect(
      document.restoreBlock({
        type: 'deleted',
        block: value[1],
        previousKey: value[0]._key,
        nextKey: undefined,
      }),
    ).toEqual([])
    expect(document.getValue()).toEqual(value)
  })

  test('a deleted block put back into an empty field replaces the placeholder', () => {
    const keyGenerator = createTestKeyGenerator()
    const [block] = parseTextspec({keyGenerator}, 'B: foo').value
    const document = createDocument({keyGenerator}, {value: undefined})

    expect(
      document.restoreBlock({
        type: 'deleted',
        block,
        previousKey: undefined,
        nextKey: undefined,
      }),
    ).toEqual([setIfMissing([], []), insert([block], 'before', [0])])
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(document.getValue()).toEqual([block])
  })
})

describe('the placeholder', () => {
  test('an empty field shows one empty block that is not content yet', () => {
    const keyGenerator = createTestKeyGenerator()

    for (const value of [undefined, []]) {
      const document = createDocument({keyGenerator}, {value})
      const placeholderKey = document.getPlaceholderKey()

      expect(document.toTextspec()).toEqual('B: |')
      expect(document.getValue()).toEqual([
        {
          _type: 'block',
          _key: placeholderKey,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: value === undefined ? 'k1' : 'k3',
              text: '',
              marks: [],
            },
          ],
        },
      ])
      expect(placeholderKey).toEqual(value === undefined ? 'k0' : 'k2')
    }
  })

  test('the first keystroke creates the field and the block in the same batch', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument({keyGenerator}, {value: undefined})

    const firstResult = document.type('x')

    expect(firstResult).toEqual({
      patches: [
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            },
          ],
          'before',
          [0],
        ),
        diffMatchPatch('', 'x', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ],
      undoStep: {
        type: 'typed',
        blockKey: 'k0',
        spanKey: 'k1',
        offset: 0,
        text: 'x',
      },
    })
    expect(createsBlock(firstResult.patches)).toEqual(true)
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(document.toTextspec()).toEqual('B: x|')
    expect(applyAll(undefined, firstResult.patches)).toEqual(
      document.getValue(),
    )

    const secondResult = document.type('y')

    expect(secondResult).toEqual({
      patches: [
        diffMatchPatch('x', 'xy', [
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
          'text',
        ]),
      ],
      undoStep: {
        type: 'typed',
        blockKey: 'k0',
        spanKey: 'k1',
        offset: 1,
        text: 'y',
      },
    })
    expect(createsBlock(secondResult.patches)).toEqual(false)
  })

  test('setting a style on the placeholder creates the block first', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument({keyGenerator}, {value: []})

    const result = document.setStyle('h1')

    expect(result.patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      set('h1', [{_key: 'k0'}, 'style']),
    ])
    expect(applyAll([], result.patches)).toEqual(document.getValue())
  })

  test('inserting a block after the placeholder creates the placeholder first', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument({keyGenerator}, {value: undefined})

    const result = document.insertBlock('B: foo')

    expect(result.patches).toEqual([
      setIfMissing([], []),
      insert(
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
          },
        ],
        'before',
        [0],
      ),
      insert(
        [
          {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
            style: 'normal',
          },
        ],
        'after',
        [{_key: 'k0'}],
      ),
    ])
    expect(applyAll(undefined, result.patches)).toEqual(document.getValue())
  })

  test('a lone empty block from the host is content, and typing sends only the text change', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="b1": '),
    )

    const result = document.type('x')

    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(result.patches).toEqual([
      diffMatchPatch('', 'x', [{_key: 'b1'}, 'children', {_key: 'k0'}, 'text']),
    ])
    expect(createsBlock(result.patches)).toEqual(false)
  })

  test('deleting the last block empties the field and shows a fresh placeholder', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )
    const before = document.getValue()

    const deleteResult = document.deleteBlock('foo')

    expect(deleteResult).toEqual({
      patches: [unset([{_key: 'k0'}]), unset([])],
      undoStep: {
        type: 'deleted',
        block: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
        previousKey: undefined,
        nextKey: undefined,
      },
    })
    expect(emptiesField(deleteResult.patches)).toEqual(true)
    expect(document.getPlaceholderKey()).toEqual('k2')
    expect(document.toTextspec({keys: true})).toEqual('B _key="k2": |')
    expect(applyAll(before, deleteResult.patches)).toEqual(undefined)

    const typeResult = document.type('x')

    expect(createsBlock(typeResult.patches)).toEqual(true)
    expect(emptiesField(typeResult.patches)).toEqual(false)
  })

  test('deleting the placeholder sends nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument({keyGenerator}, {value: undefined})

    expect(document.deleteBlock('')).toEqual({patches: [], undoStep: undefined})
    expect(document.getPlaceholderKey()).toEqual('k0')
  })

  test('the placeholder survives new empty content, and new content replaces it', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument({keyGenerator}, {value: undefined})

    document.setValue([])

    expect(document.getPlaceholderKey()).toEqual('k0')

    document.setValue(parseTextspec({keyGenerator}, 'B: foo').value)

    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(document.toTextspec({keys: true})).toEqual('B _key="k2": |foo')

    document.setValue(undefined)

    expect(document.getPlaceholderKey()).toEqual('k4')
    expect(document.toTextspec({keys: true})).toEqual('B _key="k4": |')
  })
})

describe(formatTextspec.name, () => {
  test('writes content on one line, with keys on request and empty content as an empty string', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;H1: bar|')

    expect([
      formatTextspec(value),
      formatTextspec(value, {keys: true}),
      formatTextspec([]),
    ]).toEqual(['B: foo;;H1: bar', 'B _key="k0": foo;;H1 _key="k2": bar', ''])
  })
})

describe(comparableTextspec.name, () => {
  test('ignores keys when the expected notation names none', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;H1: bar|'),
    )

    expect(
      comparableTextspec(
        {value: document.getValue(), selection: document.getSelection()},
        'B: foo;;H1: bar',
      ),
    ).toEqual({actual: 'B: foo;;H1: bar', expected: 'B: foo;;H1: bar'})
  })

  test('compares the keys the expected notation names, and only those', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B _key="k9": baz|'),
    )
    const actual = {
      value: document.getValue(),
      selection: document.getSelection(),
    }

    expect(comparableTextspec(actual, 'B: foo;;B _key="k9": baz')).toEqual({
      actual: 'B: foo;;B _key="k9": baz',
      expected: 'B: foo;;B _key="k9": baz',
    })
    expect(comparableTextspec(actual, 'B: foo;;B _key="k8": baz')).toEqual({
      actual: 'B: foo;;B: baz',
      expected: 'B: foo;;B _key="k8": baz',
    })
  })

  test('compares a named key that looks like a generated one', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B _key="k9": foo')

    expect(
      comparableTextspec({value, selection: null}, 'B _key="expected-k0": foo'),
    ).toEqual({
      actual: 'B: foo',
      expected: 'B _key="expected-k0": foo',
    })
  })

  test('shows every block that carries a named key', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec(
      {keyGenerator},
      'B: foo;;B _key="k9": baz;;B _key="k9": bar',
    )

    expect(
      comparableTextspec({value, selection: null}, 'B: foo;;B _key="k9": bar'),
    ).toEqual({
      actual: 'B: foo;;B _key="k9": baz;;B _key="k9": bar',
      expected: 'B: foo;;B _key="k9": bar',
    })
  })

  test('compares the caret only when the expected notation has one', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o'),
    )
    const actual = {
      value: document.getValue(),
      selection: document.getSelection(),
    }

    expect(comparableTextspec(actual, 'B: foo')).toEqual({
      actual: 'B: foo',
      expected: 'B: foo',
    })
    expect(comparableTextspec(actual, 'B: foo|')).toEqual({
      actual: 'B: fo|o',
      expected: 'B: foo|',
    })
    expect(comparableTextspec(actual, 'B: fo|o')).toEqual({
      actual: 'B: fo|o',
      expected: 'B: fo|o',
    })
  })

  test('compares blocks without keys', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const {_key: _removedKey, ...blockWithoutKey} = value[0]

    expect(
      comparableTextspec(
        {value: [blockWithoutKey as (typeof value)[number]], selection: null},
        'B: foo',
      ),
    ).toEqual({actual: 'B: foo', expected: 'B: foo'})
  })
})

describe(createsBlock.name, () => {
  test('needs a whole-field setIfMissing followed by an insert', () => {
    const keyGenerator = createTestKeyGenerator()
    const [block] = parseTextspec({keyGenerator}, 'B: ').value

    expect(
      createsBlock([setIfMissing([], []), insert([block], 'before', [0])]),
    ).toEqual(true)
    expect(createsBlock([insert([block], 'before', [0])])).toEqual(false)
    expect(
      createsBlock([
        setIfMissing([], [{_key: block._key}, 'children']),
        insert([block], 'before', [0]),
      ]),
    ).toEqual(false)
    expect(createsBlock([setIfMissing([], [])])).toEqual(false)
  })
})

describe(emptiesField.name, () => {
  test('needs a whole-field unset', () => {
    const keyGenerator = createTestKeyGenerator()
    const [block] = parseTextspec({keyGenerator}, 'B: foo').value

    expect(emptiesField([unset([{_key: block._key}]), unset([])])).toEqual(true)
    expect(emptiesField([unset([{_key: block._key}])])).toEqual(false)
  })
})
