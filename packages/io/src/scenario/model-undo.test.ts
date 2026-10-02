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
import {withModelUndo} from './model-undo'
import {createEditorWithIo} from './world'

describe(withModelUndo.name, () => {
  test('undo puts back the style another writer set underneath', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })

    expect(document.toTextspec()).toEqual('H2: foo|')

    editor.undo()

    expect(document.toTextspec()).toEqual('H1: foo|')

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [set('h2', path)],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
        patches: [set('h1', path)],
      },
    ])
  })

  test("undo isn't rebased over the editor's own echo", () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [set('h2', path)],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
        patches: [set('normal', path)],
      },
    ])
  })

  test('undo after the echo puts back the style another writer saved just before it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', path)],
    })
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('H1: foo|')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [set('h2', path)]},
      {id: 'A-2', transactionId: 'A-tk1', patches: [set('h1', path)]},
    ])
  })

  test('undo leaves a style another writer set after the editor in the same transaction', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    document.setStyle('h2')
    editor.send({type: 'mutation sent', id: 'A-1', transactionId: 'A-1+B-1'})
    editor.send({
      type: 'transaction',
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
        transactionId: 'A-tk0',
        patches: [set('h2', path)],
      },
    ])
  })

  test('undoing two confirmed style changes puts back each style in turn while the first undo is in flight', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.setStyle('h2')
    document.setStyle('h1')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
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
          set('h1', path),
        ],
      },
      {id: 'A-2', transactionId: 'A-tk1', patches: [set('normal', path)]},
    ])
  })

  test('undoing a style set on the placeholder before the block is sent puts back the normal style in the same mutation', () => {
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

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [unset([{_key: 'd-k0'}]), unset([])],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
        patches: [
          setIfMissing([], []),
          insert([placeholder], 'before', [0]),
          set('h1', path),
          set('normal', path),
        ],
      },
    ])
  })

  test('undoing typing deletes the typed text where another writer moved it', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [diffMatchPatch('foox', 'yfoox', textPath)],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: yfoo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
        patches: [diffMatchPatch('yfoox', 'yfoo', textPath)],
      },
    ])
  })

  test('undoing typing deletes the repeated word where it was typed, not the one the patch names', () => {
    const {editor, document, heard} = createLoadedEditor('B: |foofoo')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('foo')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [diffMatchPatch('foofoofoo', 'foobarfoofoo', textPath)],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: bar|foofoo')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [diffMatchPatch('foofoo', 'foofoofoo', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[1].patches,
    })
    editor.send({
      type: 'transaction',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
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
        transactionId: 'A-tk0',
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
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k2'}, 'style'])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;H1: bar')

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h1', [{_key: 'd-k2'}, 'style'])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [insert([barBlock], 'after', [{_key: 'd-k0'}])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|;;B: bar')
    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k2'}])]},
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
    editor.send({
      type: 'transaction',
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: qux|;;B: bar;;B: baz')

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k4'}])]},
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    editor.send({
      type: 'transaction',
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

    expect(document.toTextspec()).toEqual('B: bar;;B: qux|')

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {id: 'A-1', transactionId: 'A-tk0', patches: [unset([{_key: 'd-k2'}])]},
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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

    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })

    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
        patches: [unset([{_key: 'd-k0'}]), unset([])],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
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
    expect(editor.getUndoDepth()).toEqual(1)

    document.updateReadOnly(false)
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(editor.getUndoDepth()).toEqual(0)
    expect(heard.changes).toEqual([
      {origin: 'local', operations: [typed], patches: [typed]},
      {origin: 'local', operations: [reverted], patches: [reverted]},
    ])
  })

  test('undoing an insert deletes the block while it exists, and leaves the block made from the placeholder', () => {
    const {editor, document, heard} = createLoadedEditor(undefined)

    document.insertBlock('B: bar')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.undo()

    expect(document.toTextspec({keys: true})).toEqual('B _key="a-k0": |')
    expect(document.getPlaceholderKey()).toEqual(undefined)
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
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
            [{_key: 'a-k0'}],
          ),
        ],
      },
      {
        id: 'A-2',
        transactionId: 'A-tk1',
        patches: [unset([{_key: 'a-k2'}])],
      },
    ])
  })

  test('undoing an insert does nothing once another writer deleted the block', () => {
    const {editor, document, heard} = createLoadedEditor('B: foo|')

    document.insertBlock('B: bar')
    editor.send({
      type: 'transaction',
      transactionId: 'A-tk0',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[0].patches,
    })
    editor.send({
      type: 'transaction',
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [unset([{_key: 'a-k2'}])],
    })
    editor.undo()

    expect(document.toTextspec()).toEqual('B: foo|')
    expect(heard.mutations).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-tk0',
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
