import {diffMatchPatch} from '@portabletext/patches'
import {interpretChange, mapPoint} from '@portabletext/steps'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {expect, test, vi} from 'vitest'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

for (const scenario of [
  'remove middle anchor gone',
  'move anchor gone',
  'insert anchor gone',
  'remove first numeric position',
  'move edited node',
  'insert edited node',
]) {
  test(`Scenario: structural position ${scenario}`, async () => {
    const key = createTestKeyGenerator()
    const blocks = ['foo', 'bar', 'baz'].map((text) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key(), text, marks: []}],
    }))
    const engineRef = createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      initialValue: blocks,
      keyGenerator: key,
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })
    const engine = engineRef.current!
    const text = () =>
      editor
        .getSnapshot()
        .context.value.map(
          (block: any) =>
            block.children?.map((span: any) => span.text).join('') ?? '',
        )
        .join('|')
    const errors: string[] = []
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args) => errors.push(String(args[0])))
    const states = [text()]
    if (scenario === 'remove middle anchor gone')
      editor.send({type: 'delete.block', at: [{_key: blocks[1]!._key}]})
    if (scenario === 'move anchor gone' || scenario === 'move edited node')
      editor.send({
        type: 'move.block',
        at: [{_key: blocks[1]!._key}],
        to: [{_key: blocks[2]!._key}],
      })
    if (scenario === 'insert anchor gone' || scenario === 'insert edited node')
      editor.send({
        type: 'insert',
        at: [{_key: blocks[0]!._key}],
        position: 'after',
        value: {
          _type: 'block',
          _key: key(),
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key(), text: 'foo', marks: []}],
        },
      })
    if (scenario === 'remove first numeric position')
      editor.send({type: 'delete.block', at: [{_key: blocks[0]!._key}]})
    await vi.waitFor(() => expect(engine.operations).toEqual([]))
    states.push(text())
    const stored = structuredClone(engine.history)
    const insertedBlock: any = editor.getSnapshot().context.value[1]
    const patch: any =
      scenario === 'move edited node'
        ? diffMatchPatch('bar', 'barx', [
            {_key: blocks[1]!._key},
            'children',
            {_key: blocks[1]!.children[0]!._key},
            'text',
          ])
        : scenario === 'insert edited node'
          ? diffMatchPatch('foo', 'foox', [
              {_key: insertedBlock._key},
              'children',
              {_key: insertedBlock.children[0]._key},
              'text',
            ])
          : scenario === 'remove first numeric position'
            ? {
                type: 'insert',
                path: [{_key: blocks[1]!._key}],
                position: 'before',
                items: [
                  {
                    _type: 'block',
                    _key: key(),
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key(), text: 'foo', marks: []},
                    ],
                  },
                ],
              }
            : {type: 'unset', path: [{_key: blocks[0]!._key}]}
    const steps = interpretChange({value: editor.getSnapshot().context.value}, [
      patch,
    ])
    const positions = stored.undos.flatMap((item) =>
      item.operations.flatMap((operation) =>
        'path' in operation
          ? [
              {
                path: operation.path,
                mapped: mapPoint(steps, {path: operation.path, offset: 0}),
                ...('inverse' in operation && operation.inverse
                  ? {
                      inverse: operation.inverse.path,
                      mappedInverse: mapPoint(steps, {
                        path: operation.inverse.path,
                        offset: 0,
                      }),
                    }
                  : {}),
              },
            ]
          : [],
      ),
    )
    editor.send({type: 'apply', patches: [patch]})
    states.push(text())
    const rebased = structuredClone(engine.history)
    editor.send({type: 'history.undo'})
    states.push(text())
    editor.send({type: 'history.redo'})
    states.push(text())
    spy.mockRestore()
    console.warn(
      'POSITION ' +
        JSON.stringify({
          scenario,
          stored,
          patch,
          steps: steps ?? 'undefined',
          positions,
          rebased,
          states,
          errors,
        }),
    )
    expect(states[0]).toEqual('foo|bar|baz')
  })
}
