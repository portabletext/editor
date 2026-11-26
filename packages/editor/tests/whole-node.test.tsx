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


for (const depth of ['root', 'callout', 'nested callout', 'table cell', 'object PT field']) {
  for (const rewrite of ['span-baz', 'span-keeps-text', 'children-add', 'block-style', 'type', 'block-key']) {
    if ((rewrite === 'type' || rewrite === 'block-key') && depth !== 'root' && depth !== 'table cell') continue
    test(`Scenario: whole-node ${depth} ${rewrite}`, async () => {
      const {value, prefix, blocks} = buildDoc(depth, 'foo')
      const target = blocks[0]!
      const blockPath = [...prefix, {_key: target._key}]
      const spanPath = [...blockPath, 'children', {_key: target.children[0]!._key}]
      const engineRef = createRef<any>()
      const {editor} = await createTestEditor({
        keyGenerator: createTestKeyGenerator('editor'), schemaDefinition,
        initialValue: structuredClone(value),
        children: <><NodePlugin nodes={containers} /><InternalEditorEngineRefPlugin ref={engineRef} /></>,
      })
      const states = [textsAt(editor.getSnapshot().context.value, prefix)]
      const point = {path: spanPath, offset: 3}
      editor.send({type: 'select', at: {anchor: point, focus: point}})
      editor.send({type: 'insert.text', text: 'bar'})
      await vi.waitFor(() => expect(textsAt(editor.getSnapshot().context.value, prefix)).toEqual('foobar'))
      states.push(textsAt(editor.getSnapshot().context.value, prefix))
      const before = structuredClone(editor.getSnapshot().context.value)
      let current: any = before
      for (const segment of blockPath) current = typeof segment === 'string' ? current[segment] : current.find((node: any) => node._key === segment._key)
      const span = current.children[0]
      const key = createTestKeyGenerator('remote')
      const patch = rewrite === 'span-baz' ? set({...span, text: 'baz'}, spanPath)
        : rewrite === 'span-keeps-text' ? set({...span, text: 'XfoobarY'}, spanPath)
        : rewrite === 'children-add' ? set([{...span, _key: key(), text: 'baz', marks: ['strong']}, span], [...blockPath, 'children'])
        : rewrite === 'block-style' ? set({...current, style: 'h1'}, blockPath)
        : rewrite === 'type' ? set({...current, _type: 'changed'}, blockPath)
        : set({...current, _key: key()}, blockPath)
      const steps = interpretChange({value: before, schema: editor.getSnapshot().context.schema}, [patch])
      const mapping = {point: steps ? mapPoint(steps, point) : null, range: steps ? mapRange(steps, {anchor: point, focus: {...point, offset: 6}}) : null}
      const historyBefore = structuredClone(engineRef.current.history)
      editor.send({type: 'apply', patches: [patch]})
      const afterRemote = structuredClone(editor.getSnapshot().context.value)
      const historyAfter = structuredClone(engineRef.current.history)
      states.push(textsAt(afterRemote, prefix))
      editor.send({type: 'history.undo'})
      states.push(textsAt(editor.getSnapshot().context.value, prefix))
      editor.send({type: 'history.redo'})
      states.push(textsAt(editor.getSnapshot().context.value, prefix))
      console.log('WHOLE_NODE ' + JSON.stringify({depth, rewrite, states, before, patch, afterRemote, steps: steps ?? null, mapping, historyBefore, historyAfter, final: editor.getSnapshot().context.value}))
    })
  }
}
