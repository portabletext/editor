import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from '../fakes/document'
import {createFakeNetwork} from '../fakes/network'
import {createEditorWithIo} from '../scenario/world'
import {authorInstructions} from './apply'
import {applyWithContentLakeSemantics} from './content-lake'
import {getIoInternals} from './io'

describe(authorInstructions.name, () => {
  test('a remote patch on a block no unsaved work touched reaches the editor as it is', () => {
    const {editor, document, received} = createLoadedEditor('B: foo;;B: bar|')
    const fooTextPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const remotePatch = diffMatchPatch('foo', 'yfoo', fooTextPath)

    document.type('x')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(document.toTextspec()).toEqual('B: yfoo;;B: barx|')
    expect(received.slice(1)).toEqual([
      {type: 'apply', patches: [remotePatch], underneath: [remotePatch]},
    ])
  })

  test("Scenario: the editor's own echo applies nothing, and a transaction that mixes it with another writer's patch on another block applies only that patch", () => {
    const {editor, document, heard, received} =
      createLoadedEditor('B: foo|;;B: bar')
    const remotePatch = set('h1', [{_key: 'd-k2'}, 'style'])

    document.type('x')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    document.type('y')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [...heard.mutations[1].patches, remotePatch],
    })

    expect(document.toTextspec()).toEqual('B: fooxy|;;H1: bar')
    expect(received.slice(1)).toEqual([
      {type: 'apply', patches: [], underneath: heard.mutations[0].patches},
      {
        type: 'apply',
        patches: [remotePatch],
        underneath: [...heard.mutations[1].patches, remotePatch],
      },
    ])
  })

  test("a remote patch on a block the editor's unsaved work also touched becomes a `set` of the block from the working copy", () => {
    const {editor, document, received} = createLoadedEditor('B: foo|')
    const remotePatch = diffMatchPatch('foo', 'foox', [
      {_key: 'd-k0'},
      'children',
      {_key: 'd-k1'},
      'text',
    ])

    document.setStyle('h2')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(document.toTextspec()).toEqual('H2: foo|x')
    expect(received.slice(1)).toEqual([
      {
        type: 'apply',
        patches: [
          set(
            {
              _type: 'block',
              _key: 'd-k0',
              children: [
                {_type: 'span', _key: 'd-k1', text: 'foox', marks: []},
              ],
              style: 'h2',
            },
            [{_key: 'd-k0'}],
          ),
        ],
        underneath: [remotePatch],
      },
    ])
  })

  test("a remote insert after the block the editor's unsaved insert went after lines up in the server's order", () => {
    const {editor, document, heard, received} = createLoadedEditor('B: foo|')
    const [barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B: bar',
    ).value
    const remotePatch = insert([barBlock], 'after', [{_key: 'd-k0'}])

    document.insertBlock('B: baz')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(document.toTextspec()).toEqual('B: foo;;B: baz|;;B: bar')
    expect(received.slice(1)).toEqual([
      {
        type: 'apply',
        patches: [insert([barBlock], 'after', [{_key: 'a-k2'}])],
        underneath: [remotePatch],
      },
    ])

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(getIoInternals(editor).getBase().value).toEqual(document.getValue())
  })

  test("Scenario: a remote span inserted after the span the editor's unsaved span went after lines up in the server's order", () => {
    const {editor, document, received} = createLoadedEditor('B: foo|')
    const spanPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}]
    const spanKeyGenerator = createTestKeyGenerator('s-')
    const barSpan = {
      _type: 'span',
      _key: spanKeyGenerator(),
      text: 'bar',
      marks: [],
    }
    const bazSpan = {
      _type: 'span',
      _key: spanKeyGenerator(),
      text: 'baz',
      marks: [],
    }
    const remotePatch = insert([bazSpan], 'after', spanPath)

    document.applyLocalEdit([insert([barSpan], 'after', spanPath)])
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(document.getValue()).toEqual([
      {
        _type: 'block',
        _key: 'd-k0',
        children: [
          {_type: 'span', _key: 'd-k1', text: 'foo', marks: []},
          barSpan,
          bazSpan,
        ],
        style: 'normal',
      },
    ])
    expect(received.slice(1)).toEqual([
      {
        type: 'apply',
        patches: [
          insert([bazSpan], 'after', [
            {_key: 'd-k0'},
            'children',
            {_key: 's-k0'},
          ]),
        ],
        underneath: [remotePatch],
      },
    ])
  })

  test('a remote removal of the block an unsent insert went after removes both from the screen', () => {
    const {editor, document, heard, received} =
      createLoadedEditor('B: foo|;;B: bar')
    const remotePatch = unset([{_key: 'd-k0'}])

    document.type('x')
    document.insertBlock('B: baz')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(document.toTextspec()).toEqual('B: |bar')
    expect(received.slice(1)).toEqual([
      {
        type: 'apply',
        patches: [unset([{_key: 'd-k0'}]), unset([{_key: 'a-k2'}])],
        underneath: [remotePatch],
      },
    ])
    expect(heard.workDropped).toEqual([
      {
        patches: [
          insert(
            [
              {
                _type: 'block',
                _key: 'a-k2',
                children: [
                  {_type: 'span', _key: 'a-k3', text: 'baz', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'd-k0'}],
          ),
        ],
        reason: 'no target',
      },
    ])
  })

  test('Scenario: a transaction that moves the block the editor typed in, by removing it and inserting its key after another block, lines up the block list, with `value` or without', () => {
    const results = [false, true].map((carriesValue) => {
      const {editor, document, received, treeMismatches} =
        createLoadedEditor('B: foo|;;B: bar')
      const [fooBlock] = parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'B: foo',
      ).value
      const patches = [
        unset([{_key: 'd-k0'}]),
        insert([fooBlock], 'after', [{_key: 'd-k2'}]),
      ]

      document.type('x')
      editor.send({
        type: 'transaction',
        transactionId: 't1',
        previousRev: 'r1',
        resultRev: 'r2',
        patches,
        ...(carriesValue
          ? {
              value: applyWithContentLakeSemantics(
                getIoInternals(editor).getBase().value,
                patches,
              ),
            }
          : {}),
      })

      return {
        apply: received.at(-1),
        screen: document.toTextspec({keys: true}),
        treeMismatches,
      }
    })
    const expected = {
      apply: {
        type: 'apply',
        patches: [
          unset([{_key: 'd-k0'}]),
          insert(
            [
              {
                _type: 'block',
                _key: 'd-k0',
                children: [
                  {_type: 'span', _key: 'd-k1', text: 'foox', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'd-k2'}],
          ),
        ],
        underneath: [
          unset([{_key: 'd-k0'}]),
          insert(
            [
              {
                _type: 'block',
                _key: 'd-k0',
                children: [
                  {_type: 'span', _key: 'd-k1', text: 'foo', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'd-k2'}],
          ),
        ],
      },
      screen: 'B _key="d-k2": |bar;;B _key="d-k0": foox',
      treeMismatches: [],
    }

    expect(results).toEqual([expected, expected])
  })

  test('Scenario: a transaction that changes the key of the block the editor typed in and inserts a block after the new key lines up the block list, with `value` or without', () => {
    const results = [false, true].map((carriesValue) => {
      const {editor, document, received, treeMismatches} =
        createLoadedEditor('B: foo|;;B: bar')
      const [quxBlock] = parseTextspec(
        {keyGenerator: createTestKeyGenerator('b-')},
        'B: qux',
      ).value
      const patches = [
        set('k9', [{_key: 'd-k0'}, '_key']),
        insert([quxBlock], 'after', [{_key: 'k9'}]),
      ]

      document.type('x')
      editor.send({
        type: 'transaction',
        transactionId: 't1',
        previousRev: 'r1',
        resultRev: 'r2',
        patches,
        ...(carriesValue
          ? {
              value: applyWithContentLakeSemantics(
                getIoInternals(editor).getBase().value,
                patches,
              ),
            }
          : {}),
      })

      return {
        apply: received.at(-1),
        screen: document.toTextspec({keys: true}),
        treeMismatches,
      }
    })
    const expected = {
      apply: {
        type: 'apply',
        patches: [
          unset([{_key: 'd-k0'}]),
          insert(
            [
              {
                _type: 'block',
                _key: 'k9',
                children: [
                  {_type: 'span', _key: 'd-k1', text: 'foo', marks: []},
                ],
                style: 'normal',
              },
            ],
            'before',
            [{_key: 'd-k2'}],
          ),
          insert(
            [
              {
                _type: 'block',
                _key: 'b-k0',
                children: [
                  {_type: 'span', _key: 'b-k1', text: 'qux', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'k9'}],
          ),
        ],
        underneath: [
          set('k9', [{_key: 'd-k0'}, '_key']),
          insert(
            [
              {
                _type: 'block',
                _key: 'b-k0',
                children: [
                  {_type: 'span', _key: 'b-k1', text: 'qux', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'k9'}],
          ),
        ],
      },
      screen: 'B _key="k9": foo;;B _key="b-k0": qux;;B _key="d-k2": |bar',
      treeMismatches: [],
    }

    expect(results).toEqual([expected, expected])
  })

  test('Scenario: a remote patch addressed by index in a stored array with a block that is not an object reaches the editor addressed by key', () => {
    const {clock} = createFakeNetwork()
    const {
      document,
      io: editor,
      received,
      treeMismatches,
    } = createEditorWithIo({
      id: 'A',
      keyGenerator: createTestKeyGenerator('a-'),
      clock,
    })
    const value = applyWithContentLakeSemantics(
      parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'B: left;;B: oops;;B: right',
      ).value,
      [set('oops', [1])],
    )
    const remotePatch = set('h1', [2, 'style'])

    editor.send({type: 'load', value, rev: 'r1'})
    document.mount()
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [remotePatch],
    })

    expect(received.at(-1)).toEqual({
      type: 'apply',
      patches: [set('h1', [{_key: 'd-k4'}, 'style'])],
      underneath: [remotePatch],
    })
    expect(document.toTextspec()).toEqual('B: |left;;H1: right')
    expect(treeMismatches).toEqual([])
  })
})

function createLoadedEditor(textspec: string | undefined) {
  const {clock} = createFakeNetwork()
  const {
    document,
    io: editor,
    heard,
    received,
    treeMismatches,
  } = createEditorWithIo({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
  })
  const {value, caret} =
    textspec === undefined
      ? {value: undefined, caret: undefined}
      : parseTextspec({keyGenerator: createTestKeyGenerator('d-')}, textspec)

  editor.send({type: 'load', value, rev: 'r1'})
  document.mount()

  if (caret) {
    document.setCaret(caret)
  }

  return {editor, document, clock, heard, received, treeMismatches}
}
