import {getValue} from '../src/internal-utils/get-value'
import {wholeNodeGuardState} from '../src/internal-utils/whole-node-guard-state'
import {applyAll, diffMatchPatch, set} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {interpretChange, mapPoint, mapRange} from '@portabletext/steps'
import {createRef} from 'react'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {historyStepsProbe} from '../src/internal-utils/history-steps-control'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'article',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              name: 'row',
              type: 'object',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      name: 'cell',
                      type: 'object',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})
const containers = [
  defineContainer({type: 'article', arrayField: 'content'}),
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

function buildDoc(depth: string, text: string) {
  const key = createTestKeyGenerator('v')
  const blocks = [text].map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))
  let value: any[] = blocks
  let prefix: any[] = []
  const wrap = (type: string, field: string) => {
    const k = key()
    value = [{_type: type, _key: k, [field]: value}]
    prefix = [{_key: k}, field, ...prefix]
  }
  if (depth === 'callout' || depth === 'nested callout')
    wrap('callout', 'content')
  if (depth === 'nested callout') wrap('callout', 'content')
  if (depth === 'table cell') {
    wrap('cell', 'content')
    wrap('row', 'cells')
    wrap('table', 'rows')
  }
  if (depth === 'object PT field') wrap('article', 'content')
  return {value, prefix, blocks}
}

function textsAt(value: any, prefix: any[]): string {
  let nodes: any = value
  for (const seg of prefix) {
    if (nodes == null) return 'MISSING'
    if (typeof seg === 'string') nodes = nodes[seg]
    else nodes = nodes.find((n: any) => n?._key === seg._key)
  }
  if (!Array.isArray(nodes)) return 'MISSING'
  return nodes
    .map((b: any) => (b.children ?? []).map((c: any) => c.text).join(''))
    .join('|')
}



for (const depth of ['root', 'table cell']) {
  for (const guarded of [false, true]) {
    test(`Scenario: block object key ${depth} guarded ${guarded}`, async () => {
      wholeNodeGuardState.enabled = guarded
      const fixture = buildDoc(depth, 'foo')
      const objectKey = createTestKeyGenerator('object')
      const object = {_type: 'article', _key: objectKey(), content: fixture.blocks}
      const objectPath = [...fixture.prefix, {_key: object._key}]
      let displayPrefix = [...objectPath, 'content']
      const value = applyAll(fixture.value, [set([object], fixture.prefix)])
      const target = fixture.blocks[0]!
      const spanPath = [...displayPrefix, {_key: target._key}, 'children', {_key: target.children[0]!._key}]
      const engineRef = createRef<any>()
      const {editor} = await createTestEditor({schemaDefinition, initialValue: value, keyGenerator: createTestKeyGenerator('editor'), children: <><NodePlugin nodes={containers} /><InternalEditorEngineRefPlugin ref={engineRef} /></>})
      const states = [textsAt(editor.getSnapshot().context.value, displayPrefix)]
      const point = {path: spanPath, offset: 3}
      editor.send({type: 'select', at: {anchor: point, focus: point}})
      editor.send({type: 'insert.text', text: 'bar'})
      await vi.waitFor(() => expect(textsAt(editor.getSnapshot().context.value, displayPrefix)).toEqual('foobar'))
      states.push(textsAt(editor.getSnapshot().context.value, displayPrefix))
      const before = structuredClone(editor.getSnapshot().context.value)
      const current: any = getValue(before, objectPath)
      const newKey = objectKey()
      const patch = set({...current, _key: newKey}, objectPath)
      const steps = interpretChange({value: before, schema: editor.getSnapshot().context.schema}, [patch])
      const mapping = {point: steps ? mapPoint(steps, point) : null, range: steps ? mapRange(steps, {anchor: point, focus: {...point, offset: 6}}) : null}
      const historyBefore = structuredClone(engineRef.current.history)
      editor.send({type: 'apply', patches: [patch]})
      displayPrefix = [...fixture.prefix, {_key: newKey}, 'content']
      const afterRemote = structuredClone(editor.getSnapshot().context.value)
      const historyAfter = structuredClone(engineRef.current.history)
      states.push(textsAt(afterRemote, displayPrefix))
      editor.send({type: 'history.undo'})
      states.push(textsAt(editor.getSnapshot().context.value, displayPrefix))
      editor.send({type: 'history.redo'})
      states.push(textsAt(editor.getSnapshot().context.value, displayPrefix))
      console.log('WHOLE_NODE ' + JSON.stringify({depth, rewrite: 'block-object-key', guarded, states, before, patch, afterRemote, steps: steps ?? null, mapping, historyBefore, historyAfter, final: editor.getSnapshot().context.value}))
      wholeNodeGuardState.enabled = false
    })
  }
}
