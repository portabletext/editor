import {set} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {interpretChange} from '@portabletext/steps'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {expect, test, vi} from 'vitest'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

for (const scenario of [
  'insert text',
  'remove text',
  'split',
  'merge',
  'insert node',
  'remove node',
  'move node',
  'set style',
  'marks',
  'property conflict',
  'marks conflict',
  'unset property conflict',
]) {
  test(`Scenario: operation capture ${scenario}`, async () => {
    const key = createTestKeyGenerator()
    const blockKey = key()
    const spanKey = key()
    const secondBlockKey = key()
    const secondSpanKey = key()
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    }
    const second = {
      ...block,
      _key: secondBlockKey,
      children: [{...block.children[0], _key: secondSpanKey, text: 'baz'}],
    }
    const engineRef = createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      initialValue: [block, second],
      keyGenerator: key,
      schemaDefinition: defineSchema({
        styles: [{name: 'h1'}, {name: 'h2'}],
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })
    const engine = engineRef.current!
    const path = [{_key: blockKey}, 'children', {_key: spanKey}]
    const point = {path, offset: scenario === 'split' ? 1 : 3}
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await vi.waitFor(() => expect(engine.operations).toEqual([]))
    const patches: any[] = []
    editor.on('change', (event) => {
      if (event.origin === 'local') patches.push(...event.patches)
    })
    if (scenario === 'insert text')
      editor.send({type: 'insert.text', text: 'bar'})
    if (scenario === 'remove text')
      editor.send({type: 'delete.backward', unit: 'character'})
    if (scenario === 'split') editor.send({type: 'insert.break'})
    if (scenario === 'merge') {
      const start = {
        path: [{_key: secondBlockKey}, 'children', {_key: secondSpanKey}],
        offset: 0,
      }
      editor.send({type: 'select', at: {anchor: start, focus: start}})
      editor.send({type: 'delete.backward', unit: 'character'})
    }
    if (scenario === 'insert node')
      editor.send({
        type: 'insert.block',
        block: {_type: 'block', children: [], markDefs: []},
        placement: 'after',
      })
    if (scenario === 'remove node')
      editor.send({type: 'delete.block', at: [{_key: blockKey}]})
    if (scenario === 'move node')
      editor.send({
        type: 'move.block',
        at: [{_key: blockKey}],
        to: [{_key: secondBlockKey}],
      })
    if (scenario === 'set style' || scenario === 'property conflict')
      editor.send({
        type: 'block.set',
        at: [{_key: blockKey}],
        props: {style: 'h1'},
      })
    if (scenario === 'marks' || scenario === 'marks conflict') {
      editor.send({
        type: 'select',
        at: {anchor: {path, offset: 0}, focus: point},
      })
      editor.send({type: 'decorator.add', decorator: 'strong'})
    }
    if (scenario === 'unset property conflict') {
      editor.send({
        type: 'block.unset',
        at: [{_key: blockKey}],
        props: ['style'],
      })
    }
    await vi.waitFor(() => expect(engine.operations).toEqual([]))
    const stored = structuredClone(engine.history)
    const afterLocal = structuredClone(editor.getSnapshot().context.value)
    const interpreted = interpretChange({value: [block, second]}, patches)
    let remoteSteps: any = 'not applied'
    let afterRemote: any = null
    let afterUndo: any = null
    let afterRedo: any = null
    if (scenario.endsWith('conflict')) {
      const patch =
        scenario === 'property conflict' ||
        scenario === 'unset property conflict'
          ? set('h2', [{_key: blockKey}, 'style'])
          : set(['em'], [...path, 'marks'])
      remoteSteps = interpretChange({value: afterLocal}, [patch]) ?? 'undefined'
      editor.send({type: 'apply', patches: [patch]})
      afterRemote = structuredClone(editor.getSnapshot().context.value)
      editor.send({type: 'history.undo'})
      afterUndo = structuredClone(editor.getSnapshot().context.value)
      editor.send({type: 'history.redo'})
      afterRedo = structuredClone(editor.getSnapshot().context.value)
    }
    console.warn(
      'CAPTURE ' +
        JSON.stringify({
          scenario,
          before: [block, second],
          stored,
          patches,
          interpreted: interpreted ?? 'undefined',
          afterLocal,
          remoteSteps,
          afterRemote,
          afterUndo,
          afterRedo,
        }),
    )
    expect(
      stored.undos.some((item) =>
        item.operations.some((operation) => operation.type !== 'set.selection'),
      ),
    ).toEqual(true)
  })
}
