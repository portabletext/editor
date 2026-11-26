import {diffMatchPatch, set} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {expect, test, vi} from 'vitest'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

test('Scenario: arrival cost with 1000 typed undo steps', async () => {
  const key = createTestKeyGenerator()
  const blockKey = key()
  const spanKey = key()
  const path = [{_key: blockKey}, 'children', {_key: spanKey}]
  const text = 'foo' + 'bar'.repeat(1000)
  const block = {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
  }
  const engineRef = createRef<PortableTextEditorEngine>()
  const {editor} = await createTestEditor({
    initialValue: [block],
    keyGenerator: key,
    children: <InternalEditorEngineRefPlugin ref={engineRef} />,
  })
  const engine = engineRef.current!
  for (let index = 0; index < 1000; index++) {
    const point = {path, offset: 3}
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await Promise.resolve()
    await vi.waitFor(() => expect(engine.operations).toEqual([]))
    editor.send({type: 'insert.text', text: 'bar'})
    await Promise.resolve()
    await vi.waitFor(() => expect(engine.operations).toEqual([]))
  }
  expect(engine.history.undos.length).toEqual(1000)
  expect(editor.getSnapshot().context.value).toEqual([
    {...block, children: [{...block.children[0], text}]},
  ])
  const template = structuredClone(engine.history.undos)
  console.log(
    'COST_HISTORY ' +
      JSON.stringify({
        steps: template.length,
        operations: template.reduce(
          (total, step) => total + step.operations.length,
          0,
        ),
      }),
  )
  for (const shape of ['dmp', 'replace']) {
    const durations: number[] = []
    for (let index = 0; index < 220; index++) {
      engine.history = {undos: structuredClone(template), redos: []}
      expect(engine.history.undos.length).toEqual(1000)
      const before = index % 2 === 0 ? text : text + 'x'
      const after = index % 2 === 0 ? text + 'x' : text
      const patch =
        shape === 'dmp'
          ? diffMatchPatch(before, after, [...path, 'text'])
          : set({...block.children[0], text: after}, path)
      const start = performance.now()
      editor.send({type: 'apply', patches: [patch]})
      const duration = performance.now() - start
      if (index >= 20) durations.push(duration)
    }
    durations.sort((first, second) => first - second)
    console.log(
      'COST ' +
        JSON.stringify({
          shape,
          steps: 1000,
          patches: durations.length,
          median: (durations[99]! + durations[100]!) / 2,
          p95: durations[189],
          min: durations[0],
          max: durations[199],
        }),
    )
  }
})
