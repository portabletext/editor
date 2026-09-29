import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from './document'
import {createIoEditor} from './editor'
import {createNetwork} from './test/network'

describe(createIoEditor.name, () => {
  test('held transactions are applied in chain order once the missing one arrives', () => {
    const {editor, clock} = createLoadedEditor('B: foo')
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
    expect(editor.changes.length).toEqual(3)

    clock.advance(10_000)

    expect(editor.errors).toEqual([])
  })

  test('a held echo lets the next batch go out and keeps its work on screen until it applies', () => {
    const {editor} = createLoadedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.type('y')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: editor.sentBatches[0].patches,
    })

    expect(editor.sentBatches.map((batch) => batch.patches)).toEqual([
      [diffMatchPatch('foo', 'foox', textPath)],
      [diffMatchPatch('foox', 'fooxy', textPath)],
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
    const {editor} = createLoadedEditor('B: foo|')
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

    expect(editor.errors).toEqual([])
    expect(editor.document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": foox;;B _key="a-k3": bazq|;;B _key="k9": bar',
    )

    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: editor.sentBatches[0].patches,
    })

    expect(editor.sentBatches[1].patches).toEqual([
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
    ])

    editor.undo()
    editor.undo()

    expect(editor.document.toTextspec({keys: true})).toEqual(
      'B _key="d-k0": |foox;;B _key="k9": bar',
    )
  })

  test('undo puts back the style another writer set underneath', () => {
    const {editor} = createLoadedEditor('B: foo|')
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
      patches: editor.sentBatches[0].patches,
    })

    expect(editor.sentBatches.map((batch) => batch.patches)).toEqual([
      [set('h2', path)],
      [set('h1', path)],
    ])
  })

  test("undo isn't rebased over the editor's own echo", () => {
    const {editor} = createLoadedEditor('B: foo|')
    const path = [{_key: 'd-k0'}, 'style']

    editor.setStyle('h2')
    editor.transaction({
      transactionId: 'A-1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: editor.sentBatches[0].patches,
    })
    editor.undo()

    expect(editor.document.toTextspec()).toEqual('B: foo|')
    expect(editor.sentBatches.map((batch) => batch.patches)).toEqual([
      [set('h2', path)],
      [set('normal', path)],
    ])
  })

  test('a rejected batch stays on screen while the feed keeps applying', () => {
    const {editor} = createLoadedEditor('B: foo|;;B: bar')

    editor.type('x')
    editor.mutationRejected({id: 'A-1'})
    editor.transaction({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [unset([{_key: 'd-k2'}])],
    })

    expect(editor.document.toTextspec()).toEqual('B: foox|')
    expect(editor.sentBatches.length).toEqual(1)
  })
})

function createLoadedEditor(textspec: string) {
  const {clock} = createNetwork()
  const editor = createIoEditor({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
    claimLoad: true,
  })
  const {value, caret} = parseTextspec(
    {keyGenerator: createTestKeyGenerator('d-')},
    textspec,
  )

  editor.on((event) => {
    if (event.type === 'mutation' && !event.final) {
      editor.mutationSent({id: event.id, transactionId: event.id})
    }
  })
  editor.load({value, rev: 'r1'})

  if (caret) {
    editor.document.setCaret(caret)
  }

  return {editor, clock}
}
