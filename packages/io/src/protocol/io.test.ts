import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from '../fakes/document'
import {createFakeNetwork} from '../fakes/network'
import {createEditorWithIo} from '../scenario/world'
import {createIo} from './io'
import type {EditorMessageForIo} from './types'

describe(createIo.name, () => {
  test('held transactions are applied in chain order once the missing one arrives', () => {
    const {editor, document, clock, heard} = createLoadedEditor('B: foo')
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

    expect(document.toTextspec()).toEqual('B: |foo')
    expect(editor.getBase().rev).toEqual('r1')

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })

    expect(document.toTextspec()).toEqual('H2: |foox')
    expect(editor.getBase().rev).toEqual('r4')
    expect(heard.changes.length).toEqual(3)

    clock.advance(10_000)

    expect(heard.errors).toEqual([])
  })

  test('a held echo lets the next batch go out and keeps its work on screen until it applies', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    document.type('y')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
      },
    ])
    expect(document.toTextspec()).toEqual('B: fooxy|')

    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })

    expect(document.toTextspec()).toEqual('H1: fooxy|')
    expect(editor.getBase()).toEqual({
      value: parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'H1: foox',
      ).value,
      rev: 'r3',
    })
  })

  test('a pending insert re-keyed on collision takes its later patches, its undo steps and the caret with it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const barBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B _key="k9": bar',
    ).value[0]

    document.type('x')
    document.insertBlock('B _key="k9": baz')
    document.type('q')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
    })

    expect(heard.errors).toEqual([])
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": foox;;B _key="a-k3": bazq|;;B _key="k9": bar',
    )

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
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
    })

    editor.undo()
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": foox|;;B _key="k9": bar',
    )
  })

  test('a remote style under a local one reaches the editor as `underneath` of an apply with no patches', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']
    const sent: Array<EditorMessageForIo> = []
    const {send} = document
    document.send = (message) => {
      sent.push(message)
      send(message)
    }

    document.setStyle('h1')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h2', path)],
    })

    expect(document.toTextspec()).toEqual('H1: foo|')
    expect(sent).toEqual([
      {type: 'apply', patches: [], underneath: [set('h2', path)]},
    ])
    expect(heard.changes).toEqual([
      {
        origin: 'local',
        operations: [set('h1', path)],
        patches: [set('h1', path)],
      },
    ])
  })

  test('undo puts back the style another writer set underneath', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })

    expect(document.toTextspec()).toEqual('H2: foo|')

    editor.undo()

    expect(document.toTextspec()).toEqual('H1: foo|')

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [set('h2', path)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [set('h1', path)],
      },
    ])
  })

  test("undo isn't rebased over the editor's own echo", () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [set('h2', path)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [set('normal', path)],
      },
    ])
  })

  test('undo after the echo puts back the style another writer saved just before it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('H1: foo|')
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
      patches: [set('h1', path)],
    })
  })

  test('undo leaves a style another writer set after the editor in the same transaction', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.mutationSent({id: 'A-1', transactionId: 'A-1+B-1'})
    editor.transaction({
      transactionId: 'A-1+B-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h2', path), set('h1', path)],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('H1: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [set('h2', path)],
      },
    ])
  })

  test('undoing two confirmed style changes puts back each style in turn while the first undo is in flight', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.setStyle('h2')
    document.setStyle('h1')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 'A-t2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[1].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('H2: foo|')

    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
  })

  test('undoing a style set on the placeholder keeps the block and puts back the normal style', () => {
    const {editor, document, heard} = createLoadedEditor(undefined)
    const path = [{_key: 'a-k0'}, 'style']

    document.setStyle('h1')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
      patches: [set('normal', path)],
    })
  })

  test('undoing a style set on the placeholder before the block is sent puts back the normal style in the same batch', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const placeholder = {
      _type: 'block',
      _key: 'a-k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'a-k3', text: '', marks: []}],
    }
    const path = [{_key: 'a-k2'}, 'style']

    document.deleteBlock('foo')
    document.setStyle('h1')
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="a-k2": |')
    expect(document.getPlaceholderKey()).toEqual(undefined)

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
      patches: [
        setIfMissing([], []),
        insert([placeholder], 'before', [0]),
        set('h1', path),
        set('normal', path),
      ],
    })
  })

  test('undoing typing deletes the typed text where another writer moved it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    editor.transaction({
      transactionId: 'A-t1',
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

    expect(document.toTextspec()).toEqual('B: yfoo|')
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
      patches: [diffMatchPatch('yfoox', 'yfoo', textPath)],
    })
  })

  test('undoing typing deletes the repeated word where it was typed, not the one the patch names', () => {
    const {editor, document, heard} = createLoadedEditor('B: |foofoo')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('foo')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [diffMatchPatch('foofoofoo', 'foobarfoofoo', textPath)],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: |barfoofoo')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [diffMatchPatch('foofoo', 'foofoofoo', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [
          {
            type: 'diffMatchPatch',
            path: textPath,
            value: '@@ -1,11 +1,8 @@\n-foo\n barfoofo\n',
          },
        ],
      },
    ])
  })

  test('undoing typing deletes the typed word where a later local deletion moved it', () => {
    const {editor, document, heard} = createLoadedEditor('B: xyz|foofoo')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('foo')
    document.putCaretAfter('xyz')
    document.deleteBeforeCaret('xyz')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.transaction({
      transactionId: 'A-t2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[1].patches,
    })
    editor.transaction({
      transactionId: 't3',
      previousRev: 'r3',
      resultRev: 'r4',
      patches: [diffMatchPatch('foofoofoo', 'foobarfoofoo', textPath)],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: |barfoofoo')
  })

  test("undoing the first keystroke into an empty field deletes the text and keeps another writer's content", () => {
    const {editor, document, heard} = createLoadedEditor(undefined)
    const textPath = [{_key: 'a-k0'}, 'children', {_key: 'a-k1'}, 'text']
    const barBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B: bar',
    ).value[0]

    document.type('x')
    editor.transaction({
      transactionId: 'A-t1',
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

    expect(document.toTextspec()).toEqual('B: |;;B: bar')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
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
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [diffMatchPatch('x', '', textPath)],
      },
    ])
  })

  test('undoing a delete puts the block back after its previous sibling', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
      },
    ])
  })

  test('undoing a delete puts the block back as another writer changed it while the delete was in flight', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;H1: bar',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k2'}, 'style'])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;H1: bar')

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
      },
    ])
  })

  test('undoing a confirmed delete puts the block back as the base held it just before the delete', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-t1',
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

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
      },
    ])
  })

  test('undoing a delete does nothing once the block is back', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')
    const [, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 'A-t1',
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

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k2'}])]},
    ])
    expect(heard.errors).toEqual([])
  })

  test('undoing a delete puts the block back before its next sibling once another writer removed the previous one', () => {
    const {editor, document, heard} = createLoadedEditor(
      'B: qux;;B: foo;;B: bar|;;B: baz',
    )
    const [, , barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: qux;;B: foo;;B: bar;;B: baz',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: |qux;;B: bar;;B: baz')

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k4'}])]},
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [insert([barBlock], 'before', [{_key: 'd-k6'}])],
      },
    ])
  })

  test('undoing a delete puts the block back first once another writer removed both its siblings', () => {
    const {editor, document, heard} = createLoadedEditor(
      'B: foo;;B: bar|;;B: baz',
    )
    const [, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar;;B: baz',
    ).value
    const [quxBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B: qux',
    ).value

    document.deleteBlock('bar')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [
        unset([{_key: 'd-k0'}]),
        unset([{_key: 'd-k4'}]),
        insert([quxBlock], 'after', [{_key: 'd-k2'}]),
      ],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: bar;;B: |qux')

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-t1', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [insert([barBlock], 'before', [{_key: 'b-k0'}])],
      },
    ])
  })

  test('undoing the delete of the last block puts it back as the content of the empty field', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const [fooBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo',
    ).value

    document.deleteBlock('foo')
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="d-k0": |foo')
    expect(document.getPlaceholderKey()).toEqual(undefined)

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [unset([{_key: 'd-k0'}]), unset([])],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [setIfMissing([], []), insert([fooBlock], 'before', [0])],
      },
    ])
  })

  test('a read-only editor refuses an undo, and the step stays for later', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const typed = diffMatchPatch('foo', 'foox', textPath)
    const reverted = diffMatchPatch('foox', 'foo', textPath)

    document.type('x')
    document.updateReadOnly(true)
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foox|')
    expect(editor.inspect().undoDepth).toEqual(1)

    document.updateReadOnly(false)
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(editor.inspect().undoDepth).toEqual(0)
    expect(heard.changes).toEqual([
      {origin: 'local', operations: [typed], patches: [typed]},
      {origin: 'local', operations: [reverted], patches: [reverted]},
    ])
  })

  test('undoing an insert deletes the block while it exists, and leaves the block made from the placeholder', () => {
    const {editor, document, heard} = createLoadedEditor(undefined)

    document.insertBlock('B: bar')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations[1]).toEqual({
      id: 'A-2',
      transactionId: 'A-t2',
      patches: [unset([{_key: 'a-k2'}])],
    })
  })

  test('undoing an insert does nothing once another writer deleted the block', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.insertBlock('B: bar')
    editor.transaction({
      transactionId: 'A-t1',
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

    expect(document.toTextspec()).toEqual('B: |foo')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
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
      },
    ])
  })

  test('a re-keyed pending insert whose target another writer deleted leaves the caret where the document puts it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')
    const bazBlock = parseTextspec(
      {keyGenerator: createTestKeyGenerator('b-')},
      'B _key="k9": baz',
    ).value[0]

    document.type('x')
    document.insertBlock('B _key="k9": qux')
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
    expect(document.toTextspec({keys: true})).toEqual(
      'B _key="d-k2": |bar;;B _key="k9": baz',
    )
  })

  test('a rejected batch stays on screen while the feed keeps applying', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')

    document.type('x')
    editor.mutationRejected({id: 'A-1'})
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })

    expect(document.toTextspec()).toEqual('B: foox|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [
          diffMatchPatch('foo', 'foox', [
            {_key: 'd-k0'},
            'children',
            {_key: 'd-k1'},
            'text',
          ]),
        ],
      },
    ])
  })

  test('`inspect` reports the batch in flight, the rejected one, pending changes and held transactions', () => {
    const {editor, document, clock} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    document.type('y')
    clock.advance(500)
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [],
    })

    expect(editor.inspect()).toEqual({
      inFlight: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
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
      undoDepth: 2,
    })

    editor.mutationRejected({id: 'A-1'})
    clock.advance(10_000)

    expect(editor.inspect()).toEqual({
      inFlight: undefined,
      rejected: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
      echoed: [],
      pending: [
        {
          patchCount: 1,
          patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        },
      ],
      held: [],
      outOfStep: true,
      undoDepth: 2,
    })
  })

  test('a rejection for a batch that already came back is ignored with a warning', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.mutationRejected({id: 'A-1'})
    document.type('y')

    expect(heard.warnings).toEqual([
      '`mutation rejected` for batch "A-1", not in flight',
    ])
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
      },
    ])
  })

  test('a `diffMatchPatch` on a non-string puts the editor out of step, and a patch for a missing parent does nothing', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const failingPatch = diffMatchPatch('foo', 'foox', [
      {_key: 'd-k0'},
      'children',
    ])

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
    expect(document.toTextspec()).toEqual('B: foo|')
  })

  test('a remote insert that brings the same key twice puts the editor out of step', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
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
    expect(document.toTextspec()).toEqual('B: foo|')
  })

  test('a key repair never picks a key the value already has', () => {
    const {clock} = createFakeNetwork()
    const {
      document,
      io: editor,
      heard,
    } = createEditorWithIo({
      id: 'A',
      keyGenerator: createTestKeyGenerator('a-'),
      clock,
    })
    const {value} = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B _key="a-k2": foo;;B _key="missing": bar',
    )
    const keylessBlock = {...value[1]}
    Reflect.deleteProperty(keylessBlock, '_key')

    editor.load({value: [value[0], keylessBlock], rev: 'r1'})
    document.mount()

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [set('a-k3', [1, '_key'])],
      },
    ])
  })

  test('a batch in flight without its echo warns after 10 seconds, then with backoff', () => {
    const {editor, document, clock, heard} = createLoadedEditor('B: foo|')

    document.type('x')
    clock.advance(9_999)

    expect(heard.warnings).toEqual([])

    clock.advance(1)
    clock.advance(20_000)

    expect(heard.warnings).toEqual([
      'Batch "A-1" has been in flight for 10000 ms without coming back',
      'Batch "A-1" has been in flight for 30000 ms without coming back',
    ])

    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    clock.advance(100_000)

    expect(heard.warnings.length).toEqual(2)
  })

  test('a second load in the first commit replaces the first, repairs included, and a load after the editor is ready throws', () => {
    const {clock} = createFakeNetwork()
    const {
      document,
      io: editor,
      heard,
    } = createEditorWithIo({
      id: 'A',
      keyGenerator: createTestKeyGenerator('a-'),
      clock,
    })
    const [fooBlock, barBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo;;B: bar',
    ).value
    const keylessBlock = {...fooBlock}
    Reflect.deleteProperty(keylessBlock, '_key')

    editor.load({value: [keylessBlock], rev: 'r1'})
    editor.load({value: [barBlock], rev: 'r2'})
    const statusBeforeMount = editor.getStatus()
    document.mount()

    expect({
      statusBeforeMount,
      status: editor.getStatus(),
      screen: document.toTextspec({keys: true}),
      rev: editor.getBase().rev,
      mutations: heard.mutations,
      changes: heard.changes,
    }).toEqual({
      statusBeforeMount: 'loading',
      status: 'ready',
      screen: 'B _key="d-k2": |bar',
      rev: 'r2',
      mutations: [],
      changes: [],
    })
    expect(() => editor.load({value: [fooBlock], rev: 'r3'})).toThrow(
      '`load` is only accepted in the first commit, before the editor is ready',
    )
    expect(document.toTextspec()).toEqual('B: |bar')
  })

  test('a resync reports the rejected batch it drops and unsent changes that no longer have a target as dropped work', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo;;B: bar|')
    const [fooBlock] = parseTextspec(
      {keyGenerator: createTestKeyGenerator('d-')},
      'B: foo',
    ).value

    document.type('x')
    document.type('y')
    editor.mutationRejected({id: 'A-1'})
    editor.resync({value: [fooBlock], rev: 'r2'})

    expect(heard.warnings).toEqual([
      '1 unsent patches had no target after the resync and did nothing',
    ])
    expect(heard.workDropped).toEqual([
      {
        patches: [
          diffMatchPatch('bar', 'barx', [
            {_key: 'd-k2'},
            'children',
            {_key: 'd-k3'},
            'text',
          ]),
        ],
        reason: 'rejected',
      },
      {
        patches: [
          diffMatchPatch('barx', 'barxy', [
            {_key: 'd-k2'},
            'children',
            {_key: 'd-k3'},
            'text',
          ]),
        ],
        reason: 'no target',
      },
    ])
    expect(document.toTextspec()).toEqual('B: |foo')
  })

  test('a transaction that takes the target of unsent changes away reports them as dropped work once', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo;;B: bar|')
    const textPath = [{_key: 'd-k2'}, 'children', {_key: 'd-k3'}, 'text']

    document.type('x')
    document.type('y')
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })
    editor.transaction({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })

    expect(heard.warnings).toEqual([
      '1 unsent patches had no target after transaction "t1" and did nothing',
    ])
    expect(heard.workDropped).toEqual([
      {
        patches: [diffMatchPatch('barx', 'barxy', textPath)],
        reason: 'no target',
      },
    ])
    expect(editor.inspect().pending).toEqual([
      {
        patchCount: 1,
        patches: [diffMatchPatch('barx', 'barxy', textPath)],
      },
    ])
    expect(document.toTextspec()).toEqual('H1: |foo')
  })

  test('closing while sending is blocked reports the unsent changes as dropped work', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.type('x')
    editor.mutationRejected({id: 'A-1'})
    document.type('y')
    document.close()

    expect(heard.warnings).toEqual([
      '1 unsent change(s) dropped on close: sending was blocked by the rejection of batch A-1',
    ])
    expect(heard.workDropped).toEqual([
      {
        patches: [
          diffMatchPatch('foox', 'fooxy', [
            {_key: 'd-k0'},
            'children',
            {_key: 'd-k1'},
            'text',
          ]),
        ],
        reason: 'closed while blocked',
      },
    ])
    expect(heard.mutations.map((batch) => batch.id)).toEqual(['A-1'])
  })

  test('a `mutation sent` with another transaction ID replaces the proposed one as the ID that confirms the batch', () => {
    const results = ['A-t1', 'commit-1'].map((transactionId) => {
      const {editor, document, heard} = createLoadedEditor('B: foo|')

      document.type('x')
      const inFlightProposed = editor.inspect().inFlight
      editor.mutationSent({id: 'A-1', transactionId: 'commit-1'})
      const inFlightNamed = editor.inspect().inFlight
      document.type('y')
      editor.transaction({
        transactionId,
        previousRev: 'r1',
        resultRev: 'r2',
        patches: heard.mutations[0].patches,
      })

      return {
        inFlightProposed,
        inFlightNamed,
        inFlightAfter: editor.inspect().inFlight,
        warnings: heard.warnings,
      }
    })

    expect(results).toEqual([
      {
        inFlightProposed: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
        inFlightNamed: {id: 'A-1', transactionIds: ['commit-1'], patchCount: 1},
        inFlightAfter: {id: 'A-1', transactionIds: ['commit-1'], patchCount: 1},
        warnings: [],
      },
      {
        inFlightProposed: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
        inFlightNamed: {id: 'A-1', transactionIds: ['commit-1'], patchCount: 1},
        inFlightAfter: {id: 'A-2', transactionIds: ['A-t2'], patchCount: 1},
        warnings: [],
      },
    ])
  })

  test('a second `mutation sent` with another transaction ID warns, and either ID confirms the batch', () => {
    const results = ['commit-1', 'retry-1'].map((transactionId) => {
      const {editor, document, heard} = createLoadedEditor('B: foo|')

      document.type('x')
      editor.mutationSent({id: 'A-1', transactionId: 'commit-1'})
      editor.mutationSent({id: 'A-1', transactionId: 'retry-1'})
      const inFlightBefore = editor.inspect().inFlight
      document.type('y')
      editor.transaction({
        transactionId,
        previousRev: 'r1',
        resultRev: 'r2',
        patches: heard.mutations[0].patches,
      })

      return {
        inFlightBefore,
        inFlightAfter: editor.inspect().inFlight,
        warnings: heard.warnings,
        screen: document.toTextspec(),
      }
    })

    expect(results).toEqual(
      ['commit-1', 'retry-1'].map(() => ({
        inFlightBefore: {
          id: 'A-1',
          transactionIds: ['commit-1', 'retry-1'],
          patchCount: 1,
        },
        inFlightAfter: {id: 'A-2', transactionIds: ['A-t2'], patchCount: 1},
        warnings: [
          '`mutation sent` names transaction "retry-1" for batch "A-1", already sent as "commit-1": a retry must reuse the transaction ID',
        ],
        screen: 'B: fooxy|',
      })),
    )
  })

  test('a lost feed puts the editor out of step with a warning, and it still notes its own echo', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.type('x')
    editor.feedLost()
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect({
      errors: heard.errors,
      warnings: heard.warnings,
      sync: editor.getSync(),
      screen: document.toTextspec(),
      rev: editor.getBase().rev,
      inFlight: editor.inspect().inFlight,
    }).toEqual({
      errors: [],
      warnings: [
        'The feed was lost: applying no more transactions until a resync',
      ],
      sync: 'out of step',
      screen: 'B: foox|',
      rev: 'r1',
      inFlight: undefined,
    })
  })

  test('a resync while a batch is in flight is refused without its outcome, and with it takes the copy, and a batch not applied rejoins the pending changes ahead of the rest', () => {
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const results = (
      [
        ['applied', 'B: foox'],
        ['not applied', 'B: foo'],
      ] as const
    ).map(([outcome, copy]) => {
      const {editor, document, heard} = createLoadedEditor('B: foo|')
      const {value} = parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        copy,
      )

      document.type('x')
      document.type('y')
      editor.resync({value, rev: 'r2'})
      const screenAfterRefusal = document.toTextspec()
      editor.resync({value, rev: 'r2', outcomes: {'A-1': outcome}})

      return {
        screenAfterRefusal,
        warnings: heard.warnings,
        screen: document.toTextspec(),
        rev: editor.getBase().rev,
        batches: heard.mutations.map(({id, patches}) => ({id, patches})),
        inFlight: editor.inspect().inFlight,
      }
    })

    expect(results).toEqual([
      {
        screenAfterRefusal: 'B: fooxy|',
        warnings: [
          'Refused a resync while batch "A-1" is in flight: wait until it comes back or is rejected, or say what became of it',
        ],
        screen: 'B: fooxy|',
        rev: 'r2',
        batches: [
          {id: 'A-1', patches: [diffMatchPatch('foo', 'foox', textPath)]},
          {id: 'A-2', patches: [diffMatchPatch('foox', 'fooxy', textPath)]},
        ],
        inFlight: {id: 'A-2', transactionIds: ['A-t2'], patchCount: 1},
      },
      {
        screenAfterRefusal: 'B: fooxy|',
        warnings: [
          'Refused a resync while batch "A-1" is in flight: wait until it comes back or is rejected, or say what became of it',
        ],
        screen: 'B: fooxy|',
        rev: 'r2',
        batches: [
          {id: 'A-1', patches: [diffMatchPatch('foo', 'foox', textPath)]},
          {
            id: 'A-2',
            patches: [
              diffMatchPatch('foo', 'foox', textPath),
              diffMatchPatch('foox', 'fooxy', textPath),
            ],
          },
        ],
        inFlight: {id: 'A-2', transactionIds: ['A-t2'], patchCount: 2},
      },
    ])
  })

  test('an own echo with a set above a path the batch touched is an echo mismatch, and one with a patch on another block is not', () => {
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const otherBlockPatch = set('h1', [{_key: 'd-k2'}, 'style'])
    const ancestorPatch = set(
      {_type: 'block', _key: 'd-k0', children: [], style: 'normal'},
      [{_key: 'd-k0'}],
    )
    const results = [otherBlockPatch, ancestorPatch].map((extraPatch) => {
      const {editor, document, heard} = createLoadedEditor('B: foo|;;B: bar')

      document.type('x')
      editor.transaction({
        transactionId: 'A-t1',
        previousRev: 'r1',
        resultRev: 'r2',
        patches: [extraPatch, diffMatchPatch('foo', 'foox', textPath)],
      })

      return {
        errors: heard.errors,
        sync: editor.getSync(),
        screen: document.toTextspec(),
        rev: editor.getBase().rev,
        inFlight: editor.inspect().inFlight,
      }
    })

    expect(results).toEqual([
      {
        errors: [],
        sync: 'synced',
        screen: 'B: foox|;;H1: bar',
        rev: 'r2',
        inFlight: undefined,
      },
      {
        errors: [
          {
            reason: 'echo mismatch',
            transactionId: 'A-t1',
            patch: ancestorPatch,
          },
        ],
        sync: 'out of step',
        screen: 'B: foox|;;B: bar',
        rev: 'r1',
        inFlight: undefined,
      },
    ])
  })

  test('sync is saving while work is unsaved, blocked after a rejection and out of step after an error, each until a resync', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const syncs = [editor.getSync()]

    document.type('x')
    syncs.push(editor.getSync())
    document.type('y')
    syncs.push(editor.getSync())
    editor.transaction({
      transactionId: 'A-t1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    syncs.push(editor.getSync())
    editor.transaction({
      transactionId: 'A-t2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[1].patches,
    })
    syncs.push(editor.getSync())
    document.type('z')
    document.type('w')
    editor.mutationRejected({id: 'A-3'})
    syncs.push(editor.getSync())
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r3',
      resultRev: 'r4',
      patches: [diffMatchPatch('foo', 'foox', [{_key: 'd-k0'}, 'children'])],
    })
    syncs.push(editor.getSync())
    editor.resync({value: editor.getBase().value, rev: 'r3'})
    syncs.push(editor.getSync())
    editor.transaction({
      transactionId: 'A-t4',
      previousRev: 'r3',
      resultRev: 'r4',
      patches: heard.mutations[3].patches,
    })
    syncs.push(editor.getSync())

    expect(syncs).toEqual([
      'synced',
      'saving',
      'saving',
      'saving',
      'synced',
      'blocked',
      'out of step',
      'saving',
      'synced',
    ])
  })

  test('inputs after the editor closes are ignored, with a warning for each the editor side gets', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.close()
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })
    editor.resync({value: undefined, rev: 'r2'})
    editor.load({value: undefined, rev: 'r2'})
    document.type('x')
    document.setStyle('h1')
    document.insertBlock('B: bar')
    document.deleteBlock('foo')
    editor.undo()
    document.putCaretAfter('f')

    expect(heard.warnings).toEqual([
      'Ignored transaction "t1" after the editor unmounted',
      'Ignored a resync after the editor unmounted',
      'Ignored a load after the editor unmounted',
      'Ignored an undo after the editor unmounted',
    ])
    expect(editor.getStatus()).toEqual('unmounted')
    expect(document.toTextspec()).toEqual('B: foo|')
    expect(editor.getBase().rev).toEqual('r1')
    expect(heard.mutations).toEqual([])
    expect(heard.changes).toEqual([])
  })

  test("the editor side is ready once the editor's first commit ends, with a load or without one", () => {
    const {clock} = createFakeNetwork()
    const results = [false, true].map((loaded) => {
      const {document, io: editor} = createEditorWithIo({
        id: 'A',
        keyGenerator: createTestKeyGenerator('a-'),
        clock,
      })

      if (loaded) {
        editor.load({
          value: parseTextspec(
            {keyGenerator: createTestKeyGenerator('d-')},
            'B: foo',
          ).value,
          rev: 'r1',
        })
      }

      const statusBeforeMount = editor.getStatus()
      document.mount()

      return {
        statusBeforeMount,
        status: editor.getStatus(),
        screen: document.toTextspec(),
      }
    })

    expect(results).toEqual([
      {statusBeforeMount: 'loading', status: 'ready', screen: 'B: |'},
      {statusBeforeMount: 'loading', status: 'ready', screen: 'B: |foo'},
    ])
  })
})

function createLoadedEditor(textspec: string | undefined) {
  const {clock} = createFakeNetwork()
  const {
    document,
    io: editor,
    heard,
  } = createEditorWithIo({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
  })
  const {value, caret} =
    textspec === undefined
      ? {value: undefined, caret: undefined}
      : parseTextspec({keyGenerator: createTestKeyGenerator('d-')}, textspec)

  editor.load({value, rev: 'r1'})
  document.mount()

  if (caret) {
    document.setCaret(caret)
  }

  return {editor, document, clock, heard}
}
