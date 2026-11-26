import {applyAll, diffMatchPatch, set} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
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

for (const depth of [
  'root',
  'callout',
  'nested callout',
  'table cell',
  'object PT field',
]) {
  for (const scenario of ['overlap', 'gap', 'gap-ce', 'gap-wide', 'style']) {
    test(`Scenario: contract ${depth} ${scenario}`, async () => {
      const initialText = scenario.startsWith('gap') ? 'abcdefghij' : 'foo'
      const {value, prefix, blocks} = buildDoc(depth, initialText)
      const target = blocks[0]!
      const blockPath = [...prefix, {_key: target._key}]
      const spanPath = [
        ...blockPath,
        'children',
        {_key: target.children[0]!._key},
      ]
      const textPath = [...spanPath, 'text']
      const {editor} = await createTestEditor({
        keyGenerator: createTestKeyGenerator('editor'),
        schemaDefinition,
        initialValue: structuredClone(value),
        children: <NodePlugin nodes={containers} />,
      })
      const select = (offset: number) => {
        const point = {path: spanPath, offset}
        editor.send({type: 'select', at: {anchor: point, focus: point}})
      }
      const text = () => textsAt(editor.getSnapshot().context.value, prefix)
      const states = [text()]
      if (scenario.startsWith('gap')) {
        select(6)
        editor.send({type: 'delete.backward', unit: 'character'})
        await vi.waitFor(() => expect(text()).toEqual('abcdeghij'))
        select(4)
        editor.send({type: 'delete.backward', unit: 'character'})
        await vi.waitFor(() => expect(text()).toEqual('abceghij'))
      } else {
        select(3)
        editor.send({type: 'insert.text', text: 'bar'})
        await vi.waitFor(() => expect(text()).toEqual('foobar'))
      }
      states.push(text())
      editor.send({
        type: 'apply',
        patches: [
          scenario === 'style'
            ? set('h2', [...blockPath, 'style'])
            : diffMatchPatch(
                scenario.startsWith('gap') ? 'abceghij' : 'foobar',
                scenario === 'gap-wide'
                  ? 'abhij'
                  : scenario === 'gap-ce'
                    ? 'abghij'
                    : scenario.startsWith('gap')
                      ? 'abcghij'
                      : 'foobxar',
                textPath,
              ),
        ],
      })
      await vi.waitFor(() =>
        expect(text()).toEqual(
          scenario === 'gap-wide'
            ? 'abhij'
            : scenario === 'gap-ce'
              ? 'abghij'
              : scenario.startsWith('gap')
                ? 'abcghij'
                : scenario === 'style'
                  ? 'foobar'
                  : 'foobxar',
        ),
      )
      states.push(text())
      editor.send({type: 'history.undo'})
      states.push(text())
      if (scenario.startsWith('gap')) {
        editor.send({type: 'history.undo'})
        states.push(text())
      }
      editor.send({type: 'history.redo'})
      states.push(text())
      if (scenario.startsWith('gap')) {
        editor.send({type: 'history.redo'})
        states.push(text())
      }
      console.warn(
        'CONTRACT ' +
          JSON.stringify({
            depth,
            scenario,
            states,
            value: editor.getSnapshot().context.value,
          }),
      )
      expect(states).toEqual(
        scenario === 'gap-wide'
          ? [
              'abcdefghij',
              'abceghij',
              'abhij',
              'abdhij',
              'abdfhij',
              'abdhij',
              'abhij',
            ]
          : scenario === 'gap-ce'
            ? [
                'abcdefghij',
                'abceghij',
                'abghij',
                'abdghij',
                'abdfghij',
                'abdghij',
                'abghij',
              ]
            : scenario.startsWith('gap')
              ? [
                  'abcdefghij',
                  'abceghij',
                  'abcghij',
                  'abcdghij',
                  'abcdfghij',
                  'abcdghij',
                  'abcghij',
                ]
              : scenario === 'style'
                ? ['foo', 'foobar', 'foobar', 'foo', 'foobar']
                : ['foo', 'foobar', 'foobxar', 'foox', 'foobxar'],
      )
      if (scenario === 'style') {
        expect(editor.getSnapshot().context.value).toEqual(
          applyAll(value, [
            diffMatchPatch('foo', 'foobar', textPath),
            set('h2', [...blockPath, 'style']),
          ]),
        )
      }
    })
  }
}

for (const depth of [
  'root',
  'callout',
  'nested callout',
  'table cell',
  'object PT field',
]) {
  for (const direction of ['undo', 'redo']) {
    for (const shape of [
      'root',
      'block',
      'span',
      'children',
      'text',
      'ancestors',
    ]) {
      test(`Scenario: replacement ${depth} ${direction} ${shape}`, async () => {
        const {value, prefix, blocks} = buildDoc(depth, 'foo')
        const target = blocks[0]!
        const blockPath = [...prefix, {_key: target._key}]
        const spanPath = [
          ...blockPath,
          'children',
          {_key: target.children[0]!._key},
        ]
        const textPath = [...spanPath, 'text']
        const replacement = applyAll(value, [
          diffMatchPatch('foo', 'baz', textPath),
        ])
        const paths =
          shape === 'ancestors'
            ? prefix.length > 0
              ? Array.from({length: prefix.length}, (_, index) =>
                  prefix.slice(0, index + 1),
                )
              : [[]]
            : [
                shape === 'root'
                  ? []
                  : shape === 'block'
                    ? blockPath
                    : shape === 'span'
                      ? spanPath
                      : shape === 'children'
                        ? [...blockPath, 'children']
                        : textPath,
              ]
        for (const path of paths) {
          const {editor} = await createTestEditor({
            keyGenerator: createTestKeyGenerator('editor'),
            schemaDefinition,
            initialValue: structuredClone(value),
            children: <NodePlugin nodes={containers} />,
          })
          const point = {path: spanPath, offset: 3}
          editor.send({type: 'select', at: {anchor: point, focus: point}})
          editor.send({type: 'insert.text', text: 'bar'})
          await vi.waitFor(() =>
            expect(textsAt(editor.getSnapshot().context.value, prefix)).toEqual(
              'foobar',
            ),
          )
          if (direction === 'redo') editor.send({type: 'history.undo'})
          let remoteValue: any = replacement
          for (const segment of path)
            remoteValue =
              typeof segment === 'string'
                ? remoteValue[segment]
                : remoteValue.find((node: any) => node._key === segment._key)
          editor.send({type: 'apply', patches: [set(remoteValue, path)]})
          await vi.waitFor(() =>
            expect(editor.getSnapshot().context.value).toEqual(replacement),
          )
          editor.send({
            type: direction === 'undo' ? 'history.undo' : 'history.redo',
          })
          const after = structuredClone(editor.getSnapshot().context.value)
          editor.send({
            type: direction === 'undo' ? 'history.redo' : 'history.undo',
          })
          console.warn(
            'REPLACE ' +
              JSON.stringify({
                depth,
                direction,
                shape,
                path,
                before: 'foo',
                local: 'foobar',
                remote: 'baz',
                after: textsAt(after, prefix),
                inverse: textsAt(editor.getSnapshot().context.value, prefix),
              }),
          )
          expect(after).toEqual(replacement)
          expect(editor.getSnapshot().context.value).toEqual(replacement)
        }
      })
    }
  }
}
