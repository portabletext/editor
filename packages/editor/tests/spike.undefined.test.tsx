import {diffMatchPatch, set} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {interpretChange} from '@portabletext/steps'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
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
  for (const policy of historyStepsProbe.proposal
    ? ['replacement']
    : ['drop', 'keep', 'fallback']) {
    for (const scenario of [
      'inside',
      'before',
      'other block',
      'replace block',
      'real span set',
      'real children set',
      'real text set',
    ]) {
      test(`Scenario: undefined ${policy} ${depth} ${scenario}`, async () => {
        const {value, prefix, blocks} = buildDoc(depth, 'foo')
        const keys = createTestKeyGenerator('other')
        blocks.push({
          _type: 'block',
          _key: keys(),
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: keys(), text: 'baz', marks: []}],
        })
        const target = blocks[0]!
        const span = target.children[0]!
        const blockPath = [...prefix, {_key: target._key}]
        const spanPath = [...blockPath, 'children', {_key: span._key}]
        const {editor} = await createTestEditor({
          keyGenerator: createTestKeyGenerator('editor'),
          schemaDefinition,
          initialValue: structuredClone(value),
          children: <NodePlugin nodes={containers} />,
        })
        const text = () => textsAt(editor.getSnapshot().context.value, prefix)
        const states = [text()]
        const point = {path: spanPath, offset: 3}
        editor.send({type: 'select', at: {anchor: point, focus: point}})
        editor.send({type: 'insert.text', text: 'bar'})
        await vi.waitFor(() => expect(text()).toEqual('foobar|baz'))
        states.push(text())
        const patch =
          scenario === 'inside'
            ? diffMatchPatch('foobar', 'foobxar', [...spanPath, 'text'])
            : scenario === 'before'
              ? diffMatchPatch('foobar', 'xfoobar', [...spanPath, 'text'])
              : scenario === 'other block'
                ? diffMatchPatch('baz', 'bazx', [
                    ...prefix,
                    {_key: blocks[1]!._key},
                    'children',
                    {_key: blocks[1]!.children[0]!._key},
                    'text',
                  ])
                : scenario === 'real span set'
                  ? set({...span, text: 'baz'}, spanPath)
                  : scenario === 'real children set'
                    ? set([{...span, text: 'baz'}], [...blockPath, 'children'])
                    : scenario === 'real text set'
                      ? set('baz', [...spanPath, 'text'])
                      : set(
                          {...target, children: [{...span, text: 'baz'}]},
                          blockPath,
                        )
        const realSteps = interpretChange(
          {
            value: editor.getSnapshot().context.value,
            schema: editor.getSnapshot().context.schema,
          },
          [patch],
        )
        const start = {...historyStepsProbe}
        historyStepsProbe.policy = policy as typeof historyStepsProbe.policy
        historyStepsProbe.forceUndefined = !scenario.startsWith('real')
        editor.send({type: 'apply', patches: [patch]})
        states.push(text())
        historyStepsProbe.forceUndefined = false
        editor.send({type: 'history.undo'})
        states.push(text())
        editor.send({type: 'history.redo'})
        states.push(text())
        console.warn(
          'UNDEFINED_ROW ' +
            JSON.stringify({
              depth,
              policy,
              scenario,
              forced: !scenario.startsWith('real'),
              realSteps: realSteps ?? 'undefined',
              states,
              calls: historyStepsProbe.calls - start.calls,
              undefined: historyStepsProbe.undefined - start.undefined,
              fallback: historyStepsProbe.fallback - start.fallback,
            }),
        )
        expect(states.slice(0, 2)).toEqual(['foo|baz', 'foobar|baz'])
        historyStepsProbe.policy = 'fallback'
      })
    }
  }
}
