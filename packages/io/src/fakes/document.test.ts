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
import {textEditPatch} from '../protocol/text-edits'
import type {EditorEventForIo} from '../protocol/types'
import {
  comparableTextspec,
  createFakeDocument,
  createsBlock,
  emptiesField,
  formatTextspec,
  parseTextspec,
  type FakeDocument,
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

describe(createFakeDocument.name, () => {
  test('writes back the notation it was built from', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;H2: ba|r;;H1: '),
    )

    expect(document.toTextspec()).toEqual('B: foo;;H2: ba|r;;H1: ')
  })

  test('writes keys on request', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="k9": baz;;H1: fo|o'),
    )

    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k9": baz;;H1 _key="k1": fo|o',
    )
  })

  test('puts the caret at the start of the first block when none is given', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      {value: parseTextspec({keyGenerator}, 'B: foo;;B: bar').value},
    )

    expect(document.getCaret()).toEqual({blockKey: 'k0', offset: 0})
    expect(document.toTextspec()).toEqual('B: |foo;;B: bar')
  })

  test('setting a style sets it on the caret block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [set('h1', [{_key: 'k2'}, 'style'])]

    document.setStyle('h1')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: foo;;H1: ba|r')
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('setting the h3 style works, and the notation reads and writes it', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )

    document.setStyle('h3')

    expect(document.toTextspec()).toEqual('H3: foo|')
    expect(parseTextspec({keyGenerator}, 'H3: foo')).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'foo', marks: []}],
          style: 'h3',
        },
      ],
      caret: undefined,
    })
    expect(formatTextspec(document.getValue())).toEqual('H3: foo')
  })

  test('setting an unknown style throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )

    expect(() => document.setStyle('h9')).toThrow('Unknown style "h9"')
  })

  test('typing inserts at the caret and sends a text diff', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [
      diffMatchPatch('foo', 'foxyo', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
    ]

    document.type('xy')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: foxy|o;;B: bar')
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('deleting before the caret removes the text that ends at the caret and sends a text diff', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo bar|;;B: baz'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [
      diffMatchPatch('foo bar', 'foo', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
    ]

    document.deleteBeforeCaret(' bar')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: foo|;;B: baz')
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('deleting text that is not right before the caret throws and changes nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo| bar'),
    )

    expect(() => document.deleteBeforeCaret('bar')).toThrow(
      'Expected "bar" right before the caret, found "foo"',
    )
    expect(() => document.deleteBeforeCaret('xfoo')).toThrow(
      'Expected "xfoo" right before the caret, found "foo"',
    )
    expect(() => document.deleteBeforeCaret('')).toThrow(
      'Expected "" right before the caret, found "foo"',
    )
    expect(document.toTextspec()).toEqual('B: foo| bar')
  })

  test('the caret is put after text found in one block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: bar'),
    )

    document.putCaretAfter('ba')

    expect(document.getCaret()).toEqual({blockKey: 'k2', offset: 2})
    expect(document.toTextspec()).toEqual('B: foo;;B: ba|r')
  })

  test('putting the caret after ambiguous or missing text throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
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
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|;;B: bar'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [
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
    ]

    document.insertBlock('B _key="k9": baz')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k0": foo;;B _key="k9": baz|;;B _key="k2": bar',
    )
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('an inserted block without a named key gets a generated one', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )
    const events = listen(document)

    const patches = [
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
    ]

    document.insertBlock('H2: baz')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: foo;;H2: baz|')
  })

  test('deleting the caret block moves the caret to the end of the previous block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r;;B: baz'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [unset([{_key: 'k2'}])]

    document.deleteBlock('bar')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: foo|;;B: baz')
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('deleting the first block records that it had no previous sibling', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )
    const events = listen(document)
    const before = document.getValue()

    const patches = [unset([{_key: 'k0'}])]

    document.deleteBlock('foo')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec()).toEqual('B: |bar')
    expect(applyAll(before, patches)).toEqual(document.getValue())
  })

  test('deleting another block leaves the caret where it is', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: fo|o;;B: bar'),
    )

    document.deleteBlock('bar')

    expect(document.toTextspec()).toEqual('B: fo|o')
  })

  test('deleting a block with ambiguous or missing text throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
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
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="k9": foo|'),
    )
    const events = listen(document)

    const patches = [
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
    ]

    document.insertBlock('B _key="k9": bar')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k9": foo;;B _key="k2": bar|',
    )
  })

  test('new content keeps the caret in its block, clamped to the text', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: bar|'),
    )

    document.send({
      type: 'resync',
      value: parseTextspec({keyGenerator}, 'B _key="k0": foox;;B _key="k2": b')
        .value,
    })

    expect(document.toTextspec()).toEqual('B: foox;;B: b|')
  })

  test('new content without the caret block puts the caret at the start', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: bar|'),
    )

    document.send({
      type: 'resync',
      value: parseTextspec({keyGenerator}, 'B _key="k0": foo').value,
    })

    expect(document.toTextspec()).toEqual('B: |foo')
  })
})

describe('the placeholder', () => {
  test('an empty field shows one empty block that is not content yet', () => {
    const keyGenerator = createTestKeyGenerator()

    for (const value of [undefined, []]) {
      const document = createReadyDocument({keyGenerator}, {value})
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
    const document = createReadyDocument({keyGenerator}, {value: undefined})
    const events = listen(document)

    const firstPatches = [
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
      diffMatchPatch('', 'x', [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text']),
    ]

    document.type('x')

    expect(events.splice(0)).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: firstPatches,
        patches: firstPatches,
      },
    ])
    expect(createsBlock(firstPatches)).toEqual(true)
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(document.toTextspec()).toEqual('B: x|')
    expect(applyAll(undefined, firstPatches)).toEqual(document.getValue())

    const secondPatches = [
      diffMatchPatch('x', 'xy', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
    ]

    document.type('y')

    expect(events.splice(0)).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: secondPatches,
        patches: secondPatches,
      },
    ])
    expect(createsBlock(secondPatches)).toEqual(false)
  })

  test('setting a style on the placeholder creates the block first', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument({keyGenerator}, {value: []})
    const events = listen(document)

    const patches = [
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
    ]

    document.setStyle('h1')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(applyAll([], patches)).toEqual(document.getValue())
  })

  test('inserting a block after the placeholder creates the placeholder first', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument({keyGenerator}, {value: undefined})
    const events = listen(document)

    const patches = [
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
    ]

    document.insertBlock('B: foo')

    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(applyAll(undefined, patches)).toEqual(document.getValue())
  })

  test('a lone empty block from the host is content, and typing sends only the text change', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B _key="b1": '),
    )
    const events = listen(document)

    const patches = [
      diffMatchPatch('', 'x', [{_key: 'b1'}, 'children', {_key: 'k0'}, 'text']),
    ]

    document.type('x')

    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(events.splice(0)).toEqual([
      {type: 'change', origin: 'local', operations: patches, patches: patches},
    ])
    expect(createsBlock(patches)).toEqual(false)
  })

  test('deleting the last block empties the field and shows a fresh placeholder', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )
    const events = listen(document)
    const before = document.getValue()

    const deletePatches = [unset([{_key: 'k0'}]), unset([])]

    document.deleteBlock('foo')

    expect(events.splice(0)).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: deletePatches,
        patches: deletePatches,
      },
    ])
    expect(emptiesField(deletePatches)).toEqual(true)
    expect(document.getPlaceholderKey()).toEqual('k2')
    expect(document.toTextspec({keys: true})).toEqual('B _key="k2": |')
    expect(applyAll(before, deletePatches)).toEqual(undefined)

    document.type('x')

    const [typeChange] = events.splice(0)

    expect(
      typeChange?.type === 'change' && typeChange.origin === 'local'
        ? [createsBlock(typeChange.patches), emptiesField(typeChange.patches)]
        : undefined,
    ).toEqual([true, false])
  })

  test('deleting the placeholder sends nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument({keyGenerator}, {value: undefined})

    const events = listen(document)

    document.deleteBlock('')

    expect(events).toEqual([])
    expect(document.getPlaceholderKey()).toEqual('k0')
  })

  test('the placeholder survives new empty content, and new content replaces it', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument({keyGenerator}, {value: undefined})

    document.send({type: 'resync', value: []})

    expect(document.getPlaceholderKey()).toEqual('k0')

    document.send({
      type: 'resync',
      value: parseTextspec({keyGenerator}, 'B: foo').value,
    })

    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(document.toTextspec({keys: true})).toEqual('B _key="k2": |foo')

    document.send({type: 'resync', value: undefined})

    expect(document.getPlaceholderKey()).toEqual('k4')
    expect(document.toTextspec({keys: true})).toEqual('B _key="k4": |')
  })
})

describe('the editor seam', () => {
  test('a user action emits a local change that carries its patches', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )
    const textPatch = diffMatchPatch('foo', 'foox', [
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
      'text',
    ])
    const events = listen(document)

    document.type('x')
    document.putCaretAfter('f')

    expect(events).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [textPatch],
        patches: [textPatch],
      },
    ])
  })

  test('typing or deleting a repeated word names its offset in the operation, while the patch is computed from the text before and after', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: |foofoo'),
    )
    const textPath = [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text']
    const events = listen(document)

    document.type('foo')
    document.deleteBeforeCaret('foo')

    expect(events).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'diffMatchPatch',
            path: textPath,
            value: '@@ -1,6 +1,9 @@\n+foo\n foofoo\n',
          },
        ],
        patches: [diffMatchPatch('foofoo', 'foofoofoo', textPath)],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'diffMatchPatch',
            path: textPath,
            value: '@@ -1,9 +1,6 @@\n-foo\n foofoo\n',
          },
        ],
        patches: [diffMatchPatch('foofoofoo', 'foofoo', textPath)],
      },
    ])
  })

  test('a listener hears only the event type it listens to, until it unsubscribes', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createFakeDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )
    const events: Array<EditorEventForIo> = []
    const subscription = document.on('change', (event) => events.push(event))

    document.mount()
    document.type('x')
    subscription.unsubscribe()
    document.type('y')
    document.close()

    expect(events).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [
          diffMatchPatch('foo', 'foox', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ],
        patches: [
          diffMatchPatch('foo', 'foox', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ],
      },
    ])
  })

  test('`ready` fires when the first commit ends and `closing` just before the editor stops, and actions after that do nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createFakeDocument({keyGenerator}, {value: undefined})
    const events: Array<{type: string; status: string}> = []

    for (const type of ['ready', 'closing'] as const) {
      document.on(type, (event) => {
        events.push({type: event.type, status: document.getStatus()})
      })
    }
    document.send({
      type: 'load',
      value: parseTextspec({keyGenerator}, 'B: foo').value,
    })
    document.mount()
    document.close()
    document.type('x')
    document.putCaretAfter('f')
    document.close()

    expect(events).toEqual([
      {type: 'ready', status: 'ready'},
      {type: 'closing', status: 'ready'},
    ])
    expect(document.getStatus()).toEqual('unmounted')
    expect(document.toTextspec()).toEqual('B: |foo')
  })

  test('a load in the first commit replaces the content without a change, and a load after it throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createFakeDocument({keyGenerator}, {value: undefined})
    const events = listen(document)

    document.send({
      type: 'load',
      value: parseTextspec({keyGenerator}, 'B: foo').value,
    })
    document.send({
      type: 'load',
      value: parseTextspec({keyGenerator}, 'B: bar').value,
    })
    document.mount()

    expect(() =>
      document.send({
        type: 'load',
        value: parseTextspec({keyGenerator}, 'B: baz').value,
      }),
    ).toThrow(
      '`load` is only accepted in the first commit, before the editor is ready',
    )
    expect(events).toEqual([{type: 'ready'}])
    expect(document.toTextspec()).toEqual('B: |bar')
  })

  test('a resync or an apply emits a remote change only when it changed the content, and the caret stays in the block with its key', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r'),
    )
    const {value} = parseTextspec(
      {keyGenerator},
      'B _key="k2": bar;;B _key="k0": foo',
    )
    const events = listen(document)

    document.send({type: 'resync', value: [...document.getValue()]})
    document.send({type: 'resync', value})
    document.send({type: 'apply', patches: [set(value, [])], underneath: []})
    document.send({
      type: 'apply',
      patches: [],
      underneath: [set('h1', [{_key: 'k0'}, 'style'])],
    })

    expect(events).toEqual([
      {type: 'change', origin: 'remote', operations: [set(value, [])]},
    ])
    expect(document.toTextspec()).toEqual('B: ba|r;;B: foo')
  })

  test('an apply that gives the caret block a new key keeps the caret in that block', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: ba|r'),
    )
    const [bazBlock] = parseTextspec({keyGenerator}, 'B _key="k2": baz').value

    document.send({
      type: 'apply',
      patches: [
        set('k9', [{_key: 'k2'}, '_key']),
        insert([bazBlock], 'after', [{_key: 'k9'}]),
      ],
      underneath: [],
    })

    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="k0": foo;;B _key="k9": ba|r;;B _key="k2": baz',
    )
  })

  test('Scenario: an apply moves the caret past text a patch on its span inserts before it, leaves it for an insert, and takes it to the previous block when its block goes', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: bar;;B: foo|foo'),
    )
    const [bazBlock] = parseTextspec({keyGenerator}, 'B: baz').value
    const textPath = [{_key: 'k2'}, 'children', {_key: 'k3'}, 'text']

    document.send({
      type: 'apply',
      patches: [
        textEditPatch('foofoo', {offset: 0, insertText: 'foo'}, textPath),
      ],
      underneath: [],
    })

    expect(document.toTextspec()).toEqual('B: bar;;B: foofoo|foo')

    document.send({
      type: 'apply',
      patches: [set('xfoofoofoo', textPath)],
      underneath: [],
    })

    expect(document.toTextspec()).toEqual('B: bar;;B: xfoofoo|foo')

    document.send({
      type: 'apply',
      patches: [insert([bazBlock], 'after', [{_key: 'k0'}])],
      underneath: [],
    })

    expect(document.toTextspec()).toEqual('B: bar;;B: baz;;B: xfoofoo|foo')

    document.send({
      type: 'apply',
      patches: [unset([{_key: 'k2'}])],
      underneath: [],
    })

    expect(document.toTextspec()).toEqual('B: bar;;B: baz|')
  })

  test('Scenario: an apply that inserts a span before the caret span leaves the caret in its span at its offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo|'),
    )

    document.send({
      type: 'apply',
      patches: [
        insert(
          [{_type: 'span', _key: 'k9', text: 'bar ', marks: []}],
          'before',
          [{_key: 'k0'}, 'children', {_key: 'k1'}],
        ),
      ],
      underneath: [],
    })

    expect(document.getValue()).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k9', text: 'bar ', marks: []},
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
        ],
        style: 'normal',
      },
    ])
    expect(document.getSelection()).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    })
    expect(document.toTextspec()).toEqual('B: bar foo|')
  })

  test('a local edit is a user action: it emits a local change, the caret moves back over removed text and out of a removed block, and read-only refuses it', () => {
    const keyGenerator = createTestKeyGenerator()
    const document = createReadyDocument(
      {keyGenerator},
      parseTextspec({keyGenerator}, 'B: foo;;B: barx|'),
    )
    const textPatch = diffMatchPatch('barx', 'bar', [
      {_key: 'k2'},
      'children',
      {_key: 'k3'},
      'text',
    ])
    const events = listen(document)

    document.applyLocalEdit([textPatch])

    expect(document.toTextspec()).toEqual('B: foo;;B: bar|')

    document.applyLocalEdit([unset([{_key: 'k2'}])])

    expect(document.toTextspec()).toEqual('B: foo|')

    document.updateReadOnly(true)
    document.applyLocalEdit([unset([{_key: 'k0'}]), unset([])])
    document.type('y')

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(events).toEqual([
      {
        type: 'change',
        origin: 'local',
        operations: [textPatch],
        patches: [textPatch],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [unset([{_key: 'k2'}])],
        patches: [unset([{_key: 'k2'}])],
      },
    ])
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
    const document = createReadyDocument(
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
    const document = createReadyDocument(
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
    const document = createReadyDocument(
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

function createReadyDocument(
  ...parameters: Parameters<typeof createFakeDocument>
): ReturnType<typeof createFakeDocument> {
  const document = createFakeDocument(...parameters)
  document.mount()

  return document
}

function listen(document: FakeDocument): Array<EditorEventForIo> {
  const events: Array<EditorEventForIo> = []

  for (const type of ['change', 'ready', 'closing'] as const) {
    document.on(type, (event) => events.push(event))
  }

  return events
}
