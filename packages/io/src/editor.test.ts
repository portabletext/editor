import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from './document'
import {createIoEditor} from './editor'
import {createNetwork} from './fakes/network'
import {listenTo} from './scenario/world'

describe(createIoEditor.name, () => {
  test('held transactions are applied in chain order once the missing one arrives', () => {
    const {editor, clock, heard} = createLoadedEditor('B: foo')
    const path = [{_key: 'd-k0'}, 'style']
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.transaction({
      transactionId: 't3',
      previousRev: 'r3',
      resultRev: 'r4',
      patches: [diffMatchPatch('foo', 'foox', textPath)],
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h2', path)],
    })

    expect(editor.document.toTextspec()).toEqual('B: |foo')
    expect(editor.getBase().rev).toEqual('r1')

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })

    expect(editor.document.toTextspec()).toEqual('H2: |foox')
    expect(editor.getBase().rev).toEqual('r4')
    expect(heard.changes.length).toEqual(3)

    clock.advance(10_000)

    expect(heard.errors).toEqual([])
  })

  test('a held echo lets the next batch go out and keeps its work on screen until it applies', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.type('y')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
            style: 'normal',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'fooxy', marks: []}],
            style: 'normal',
          },
        ],
      },
    ])
    expect(editor.document.toTextspec()).toEqual('B: fooxy|')

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })

    expect(editor.document.toTextspec()).toEqual('H1: fooxy|')
    expect(editor.getBase()).toEqual({
      value: parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'H1: foox',
      ).value,
      rev: 'r3',
    })
  })

  test('a pending insert re-keyed on collision takes its later patches, its undo steps and the caret with it', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const barBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B _key="k9": bar',
    ).value[0]

    editor.type('x')
    editor.insertBlock('B _key="k9": baz')
    editor.type('q')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
    })

    expect(heard.errors).toEqual([])
    expect(editor.document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": foox;;B _key="a-k3": bazq|;;B _key="k9": bar',
    )

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: 'a-k3',
              children: [{_key: 'a-k2', _type: 'span', text: 'baz', marks: []}],
              style: 'normal',
            },
          ],
          'after',
          [{_key: 'd-k0'}],
        ),
        diffMatchPatch('baz', 'bazq', [
          {_key: 'a-k3'},
          'children',
          {_key: 'a-k2'},
          'text',
        ]),
      ],
      value: [
        {
          _type: 'block',
          _key: 'd-k0',
          children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'a-k3',
          children: [{_type: 'span', _key: 'a-k2', text: 'bazq', marks: []}],
          style: 'normal',
        },
        barBlock,
      ],
    })

    editor.undo()
    editor.undo()

    expect(editor.document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": foox|;;B _key="k9": bar',
    )
  })

  test('undo puts back the style another writer set underneath', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    editor.setStyle('h2')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })

    expect(editor.document.toTextspec()).toEqual('H2: foo|')

    editor.undo()

    expect(editor.document.toTextspec()).toEqual('H1: foo|')

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [set('h2', path)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'h2',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [set('h1', path)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'h1',
          },
        ],
      },
    ])
  })

  test("undo isn't rebased over the editor's own echo", () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    editor.setStyle('h2')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [set('h2', path)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'h2',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [set('normal', path)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('undo after the echo puts back the style another writer saved just before it', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    editor.setStyle('h2')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('H1: foo|')
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [set('h1', path)],
      value: [
        {
          _type: 'block',
          _key: 'd-k0',
          children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
          style: 'h1',
        },
      ],
    })
  })

  test('undo leaves a style another writer set after the editor in the same transaction', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    editor.setStyle('h2')
    editor.mutationSent({id: 'A-1', transactionId: 'A-1+B-1'})
    editor.transaction({
      transactionId: 'A-1+B-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h2', path), set('h1', path)],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('H1: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [set('h2', path)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'h2',
          },
        ],
      },
    ])
  })

  test('undoing two confirmed style changes puts back each style in turn while the first undo is in flight', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')

    editor.setStyle('h2')
    editor.setStyle('h1')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 'A-2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[1].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('H2: foo|')

    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|')
  })

  test('undoing a style set on the placeholder keeps the block and puts back the normal style', () => {
    const {editor, heard} = createLoadedEditor(undefined)
    const path = [{_key: 'a-k0'}, 'style']

    editor.setStyle('h1')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(editor.document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [set('normal', path)],
      value: [
        {
          _type: 'block',
          _key: 'a-k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'a-k1', text: '', marks: []}],
        },
      ],
    })
  })

  test('undoing a style set on the placeholder before the block is sent puts back the normal style in the same batch', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const placeholder = {
      _type: 'block',
      _key: 'a-k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'a-k3', text: '', marks: []}],
    }
    const path = [{_key: 'a-k2'}, 'style']

    editor.deleteBlock('foo')
    editor.setStyle('h1')
    editor.undo()

    expect(editor.document.toTextspec({keys: true})).toEqual('B _key="a-k2": |')
    expect(editor.document.getPlaceholderKey()).toEqual(undefined)

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [
        setIfMissing([], []),
        insert([placeholder], 'before', [0]),
        set('h1', path),
        set('normal', path),
      ],
      value: [placeholder],
    })
  })

  test('undoing typing deletes the typed text where another writer moved it', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [diffMatchPatch('foox', 'yfoox', textPath)],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: yfoo|')
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [diffMatchPatch('yfoox', 'yfoo', textPath)],
      value: [
        {
          _type: 'block',
          _key: 'd-k0',
          children: [{_type: 'span', _key: 'd-k1', text: 'yfoo', marks: []}],
          style: 'normal',
        },
      ],
    })
  })

  test("undoing the first keystroke into an empty field deletes the text and keeps another writer's content", () => {
    const {editor, heard} = createLoadedEditor(undefined)
    const textPath = [{_key: 'a-k0'}, 'children', {_key: 'a-k1'}, 'text']
    const barBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B: bar',
    ).value[0]

    editor.type('x')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [insert([barBlock], 'after', [{_key: 'a-k0'}])],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: |;;B: bar')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [
          setIfMissing([], []),
          insert(
            [
              {
                _type: 'block',
                _key: 'a-k0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'a-k1', text: '', marks: []}],
              },
            ],
            'before',
            [0],
          ),
          diffMatchPatch('', 'x', textPath),
        ],
        value: [
          {
            _type: 'block',
            _key: 'a-k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'a-k1', text: 'x', marks: []}],
          },
        ],
      },
      {
        id: 'A-2',
        patches: [diffMatchPatch('x', '', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'a-k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'a-k1', text: '', marks: []}],
          },
          barBlock,
        ],
      },
    ])
  })

  test('undoing a delete puts the block back after its previous sibling', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [fooBlock, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    editor.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', patches: [unset([{_key: 'd-k2'}])], value: [fooBlock]},
      {
        id: 'A-2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
        value: [fooBlock, barBlock],
      },
    ])
  })

  test('undoing a delete puts the block back as another writer changed it while the delete was in flight', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [fooBlock, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;H1: bar',
    ).value

    editor.deleteBlock('bar')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k2'}, 'style'])],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|;;H1: bar')

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', patches: [unset([{_key: 'd-k2'}])], value: [fooBlock]},
      {
        id: 'A-2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
        value: [fooBlock, barBlock],
      },
    ])
  })

  test('undoing a confirmed delete puts the block back as the base held it just before the delete', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [fooBlock, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    editor.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h1', [{_key: 'd-k2'}, 'style'])],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', patches: [unset([{_key: 'd-k2'}])], value: [fooBlock]},
      {
        id: 'A-2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
        value: [fooBlock, barBlock],
      },
    ])
  })

  test('undoing a delete does nothing once the block is back', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [fooBlock, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    editor.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', patches: [unset([{_key: 'd-k2'}])], value: [fooBlock]},
    ])
    expect(heard.errors).toEqual([])
  })

  test('undoing an insert deletes the block while it exists, and leaves the block made from the placeholder', () => {
    const {editor, heard} = createLoadedEditor(undefined)

    editor.insertBlock('B: bar')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(editor.document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      patches: [unset([{_key: 'a-k2'}])],
      value: [
        {
          _type: 'block',
          _key: 'a-k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'a-k1', text: '', marks: []}],
        },
      ],
    })
  })

  test('undoing an insert does nothing once another writer deleted the block', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')

    editor.insertBlock('B: bar')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [unset([{_key: 'a-k2'}])],
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: |foo')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [
          insert(
            [
              {
                _type: 'block',
                _key: 'a-k2',
                children: [
                  {_type: 'span', _key: 'a-k3', text: 'bar', marks: []},
                ],
                style: 'normal',
              },
            ],
            'after',
            [{_key: 'd-k0'}],
          ),
        ],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foo', marks: []}],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'a-k2',
            children: [{_type: 'span', _key: 'a-k3', text: 'bar', marks: []}],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a re-keyed pending insert whose target another writer deleted leaves the caret where the document puts it', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')
    const bazBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B _key="k9": baz',
    ).value[0]

    editor.type('x')
    editor.insertBlock('B _key="k9": qux')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [
        unset([{_key: 'd-k0'}]),
        insert([bazBlock], 'after', [{_key: 'd-k2'}]),
      ],
    })

    expect(heard.errors).toEqual([])
    expect(editor.getBase().rev).toEqual('r2')
    expect(editor.document.toTextspec({keys: true})).toEqual(
      'B _key="d-k2": |bar;;B _key="k9": baz',
    )
  })

  test('a rejected batch stays on screen while the feed keeps applying', () => {
    const {editor, heard} = createLoadedEditor('B: foo|;;B: bar')

    editor.type('x')
    editor.mutationRejected({id: 'A-1'})
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })

    expect(editor.document.toTextspec()).toEqual('B: foox|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [
          diffMatchPatch('foo', 'foox', [
            {_key: 'd-k0'},
            'children',
            {_key: 'd-k1'},
            'text',
          ]),
        ],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: 'd-k2',
            children: [{_type: 'span', _key: 'd-k3', text: 'bar', marks: []}],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('`inspect` reports the batch in flight, the rejected one, pending changes and held transactions', () => {
    const {editor, clock} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.type('y')
    clock.advance(500)
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [],
    })

    expect(editor.inspect()).toEqual({
      inFlight: {id: 'A-1', transactionId: 'A-1', patchCount: 1},
      rejected: undefined,
      echoed: [],
      pending: [
        {
          patchCount: 1,
          patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        },
      ],
      held: [
        {
          transactionId: 't2',
          previousRev: 'r2',
          resultRev: 'r3',
          arrivedAt: 500,
        },
      ],
      outOfStep: false,
      readOnly: false,
    })

    editor.mutationRejected({id: 'A-1'})
    editor.updateReadOnly(true)
    clock.advance(10_000)

    expect(editor.inspect()).toEqual({
      inFlight: undefined,
      rejected: {id: 'A-1', transactionId: 'A-1', patchCount: 1},
      echoed: [],
      pending: [
        {
          patchCount: 1,
          patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        },
      ],
      held: [],
      outOfStep: true,
      readOnly: true,
    })
  })

  test('a rejection for a batch that already came back is ignored with a warning', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.mutationRejected({id: 'A-1'})
    editor.type('y')

    expect(heard.warnings).toEqual([
      '`mutation rejected` for batch "A-1", not in flight',
    ])
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
            style: 'normal',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'fooxy', marks: []}],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('a patch through a primitive puts the editor out of step, and a patch for a missing parent does nothing', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const failingPatch = set('x', [{_key: 'd-k0'}, 'style', 'name'])

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'k9'}, 'style'])],
    })

    expect(heard.errors).toEqual([])
    expect(editor.getBase().rev).toEqual('r2')

    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [failingPatch],
    })

    expect(heard.errors).toEqual([
      {reason: 'patch failed', transactionId: 't2', patch: failingPatch},
    ])
    expect(editor.getBase().rev).toEqual('r2')
    expect(editor.document.toTextspec()).toEqual('B: foo|')
  })

  test('a remote insert that brings the same key twice puts the editor out of step', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')
    const keyGenerator = createTestKeyGenerator('b-')
    const [firstBlock, secondBlock] = parseTextspec(
      {keyGenerator},
      'B _key="k7": bar;;B _key="k7": baz',
    ).value
    const duplicateInsert = insert([firstBlock, secondBlock], 'after', [
      {_key: 'd-k0'},
    ])

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [duplicateInsert],
    })

    expect(heard.errors).toEqual([
      {reason: 'duplicate key', transactionId: 't1', patch: duplicateInsert},
    ])
    expect(editor.document.toTextspec()).toEqual('B: foo|')
  })

  test('a key repair never picks a key the value already has', () => {
    const {clock} = createNetwork()
    const editor = createIoEditor({
      id: 'A',
      keyGenerator: createTestKeyGenerator('a-'),
      clock,
      claimLoad: true,
    })
    const heard = listenTo(editor)
    const {value} = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B _key="a-k2": foo;;B _key="missing": bar',
    )
    const keylessBlock = {...value[1]}
    Reflect.deleteProperty(keylessBlock, '_key')

    editor.mount()
    editor.load({value: [value[0], keylessBlock], rev: 'r1'})

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        patches: [set('a-k3', [1, '_key'])],
        value: [value[0], {...keylessBlock, _key: 'a-k3'}],
      },
    ])
  })

  test('a batch in flight without its echo warns after 10 seconds, then with backoff', () => {
    const {editor, clock, heard} = createLoadedEditor('B: foo|')

    editor.type('x')
    clock.advance(9_999)

    expect(heard.warnings).toEqual([])

    clock.advance(1)
    clock.advance(20_000)

    expect(heard.warnings).toEqual([
      'Batch "A-1" has been in flight for 10000 ms without coming back',
      'Batch "A-1" has been in flight for 30000 ms without coming back',
    ])

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    clock.advance(100_000)

    expect(heard.warnings.length).toEqual(2)
  })

  test("a claimed load that hasn't arrived after 10 seconds warns", () => {
    const {clock} = createNetwork()
    const editor = createIoEditor({
      id: 'A',
      keyGenerator: createTestKeyGenerator('a-'),
      clock,
      claimLoad: true,
    })
    const heard = listenTo(editor)

    editor.mount()
    clock.advance(10_000)
    editor.load({value: undefined, rev: undefined})
    clock.advance(100_000)

    expect(heard.warnings).toEqual([
      "The claimed first load hasn't arrived after 10000 ms",
    ])
  })

  test('a resync warns about unsent changes that no longer have a target', () => {
    const {editor, heard} = createLoadedEditor('B: foo;;B: bar|')
    const [fooBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo',
    ).value

    editor.type('x')
    editor.type('y')
    editor.mutationRejected({id: 'A-1'})
    editor.resync({value: [fooBlock], rev: 'r2'})

    expect(heard.warnings).toEqual([
      '1 unsent patches had no target after the resync and did nothing',
    ])
    expect(editor.document.toTextspec()).toEqual('B: |foo')
  })

  test('inputs after unmounting are ignored with a warning', () => {
    const {editor, heard} = createLoadedEditor('B: foo|')

    editor.close()
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })
    editor.resync({value: undefined, rev: 'r2'})
    editor.load({value: undefined, rev: 'r2'})
    editor.type('x')
    editor.setStyle('h1')
    editor.insertBlock('B: bar')
    editor.deleteBlock('foo')
    editor.undo()
    editor.putCaretAfter('f')

    expect(heard.warnings).toEqual([
      'Ignored transaction "t1" after the editor unmounted',
      'Ignored a resync after the editor unmounted',
      'Ignored a load after the editor unmounted',
      'Ignored an action after the editor unmounted',
      'Ignored an action after the editor unmounted',
      'Ignored an action after the editor unmounted',
      'Ignored an action after the editor unmounted',
      'Ignored an action after the editor unmounted',
      'Ignored an action after the editor unmounted',
    ])
    expect(editor.document.toTextspec()).toEqual('B: foo|')
    expect(editor.getBase().rev).toEqual('r1')
    expect(heard.mutations).toEqual([])
    expect(heard.changes).toEqual([])
  })

  test('`ready` fires once, whether the first load is claimed or not', () => {
    const {clock} = createNetwork()
    const readyCounts = [
      {claimLoad: false, finish: () => {}},
      {
        claimLoad: true,
        finish: (editor: ReturnType<typeof createIoEditor>) =>
          editor.load({value: undefined, rev: undefined}),
      },
      {
        claimLoad: true,
        finish: (editor: ReturnType<typeof createIoEditor>) =>
          editor.releaseClaim(),
      },
    ].map(({claimLoad, finish}) => {
      const editor = createIoEditor({
        id: 'A',
        keyGenerator: createTestKeyGenerator('a-'),
        clock,
        claimLoad,
      })
      const statuses: Array<string> = []

      editor.on((event) => {
        if (event.type === 'ready') {
          statuses.push(editor.getStatus())
        }
      })
      editor.mount()
      finish(editor)
      editor.releaseClaim()

      return statuses
    })

    expect(readyCounts).toEqual([['ready'], ['ready'], ['ready']])
  })
})

function createLoadedEditor(textspec: string | undefined) {
  const {clock} = createNetwork()
  const editor = createIoEditor({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
    claimLoad: true,
  })
  const heard = listenTo(editor)
  const {value, caret} =
    textspec === undefined
      ? {value: undefined, caret: undefined}
      : parseTextspec({keyGenerator: createTestKeyGenerator('d-')}, textspec)

  editor.on((event) => {
    if (event.type === 'mutation' && !event.final) {
      editor.mutationSent({id: event.id, transactionId: event.id})
    }
  })
  editor.mount()
  editor.load({value, rev: 'r1'})

  if (caret) {
    editor.document.setCaret(caret)
  }

  return {editor, clock, heard}
}
