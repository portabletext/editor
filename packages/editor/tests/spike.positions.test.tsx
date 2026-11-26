import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {interpretChange, mapPoint} from '@portabletext/steps'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {expect, test, vi} from 'vitest'
import {safeStringify} from '../src/internal-utils/safe-json'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
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
    if (scenario === 'remove middle anchor gone') {
      editor.send({type: 'delete.block', at: [{_key: blocks[1]!._key}]})
    }
    if (scenario === 'move anchor gone' || scenario === 'move edited node') {
      editor.send({
        type: 'move.block',
        at: [{_key: blocks[1]!._key}],
        to: [{_key: blocks[2]!._key}],
      })
    }
    if (
      scenario === 'insert anchor gone' ||
      scenario === 'insert edited node'
    ) {
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
    }
    if (scenario === 'remove first numeric position') {
      editor.send({type: 'delete.block', at: [{_key: blocks[0]!._key}]})
    }
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
      `POSITION ${safeStringify({
        scenario,
        stored,
        patch,
        steps: steps ?? 'undefined',
        positions,
        rebased,
        states,
        errors,
      })}`,
    )
    expect(states[0]).toEqual('foo|bar|baz')
  })
}

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

if ((globalThis as any).__historyRunStructuralProbes) {
  for (const depth of ['root', 'callout', 'table cell']) {
    for (const scenario of [
      'Q3 insert before removed',
      'Q3 move anchor removed',
      'Q4 move edited',
      'Q4 insert edited',
    ]) {
      for (const policy of scenario.startsWith('Q4')
        ? ['live', 'saved']
        : ['neighbours']) {
        test(`Scenario: ${scenario} ${depth} ${policy}`, async () => {
          ;(globalThis as any).__historyNeighbourPositions =
            scenario.startsWith('Q3')
          ;(globalThis as any).__historyLiveNodes = policy === 'live'
          const key = createTestKeyGenerator()
          const blocks = ['foo', 'bar', 'baz'].map((text) => ({
            _type: 'block',
            _key: key(),
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key(), text, marks: []}],
          }))
          let value: any = blocks
          let prefix: any[] = []
          const wrap = (type: string, field: string) => {
            const wrapperKey = key()
            value = [{_type: type, _key: wrapperKey, [field]: value}]
            prefix = [{_key: wrapperKey}, field, ...prefix]
          }
          if (depth === 'callout') {
            wrap('callout', 'content')
          }
          if (depth === 'table cell') {
            wrap('cell', 'content')
            wrap('row', 'cells')
            wrap('table', 'rows')
          }
          const engineRef = createRef<PortableTextEditorEngine>()
          const {editor} = await createTestEditor({
            initialValue: value,
            schemaDefinition,
            keyGenerator: key,
            children: (
              <>
                <NodePlugin nodes={containers} />
                <InternalEditorEngineRefPlugin ref={engineRef} />
              </>
            ),
          })
          const nodes = () => {
            let current: any = editor.getSnapshot().context.value
            for (const segment of prefix) {
              current =
                typeof segment === 'string'
                  ? current[segment]
                  : current.find((node: any) => node._key === segment._key)
            }
            return current
          }
          const text = () =>
            nodes()
              .map((node: any) =>
                node.children.map((span: any) => span.text).join(''),
              )
              .join('|')
          const states = [text()]
          const errors: string[] = []
          const spy = vi
            .spyOn(console, 'error')
            .mockImplementation((...args) => errors.push(String(args[0])))
          if (scenario === 'Q3 insert before removed') {
            editor.send({
              type: 'delete.block',
              at: [...prefix, {_key: blocks[0]!._key}],
            })
          } else if (scenario.includes('move')) {
            editor.send({
              type: 'move.block',
              at: [...prefix, {_key: blocks[1]!._key}],
              to: [...prefix, {_key: blocks[2]!._key}],
            })
          } else {
            editor.send({
              type: 'insert',
              at: [...prefix, {_key: blocks[0]!._key}],
              position: 'after',
              value: {
                _type: 'block',
                _key: key(),
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: key(), text: 'foo', marks: []},
                ],
              },
            })
          }
          await vi.waitFor(() =>
            expect(engineRef.current!.operations).toEqual([]),
          )
          states.push(text())
          const target =
            scenario === 'Q4 move edited'
              ? nodes().find((node: any) => node._key === blocks[1]!._key)
              : nodes()[1]
          const patch: any =
            scenario === 'Q3 insert before removed'
              ? {
                  type: 'insert',
                  path: [...prefix, {_key: blocks[1]!._key}],
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
              : scenario === 'Q3 move anchor removed'
                ? {type: 'unset', path: [...prefix, {_key: blocks[0]!._key}]}
                : diffMatchPatch(
                    target.children[0].text,
                    `${target.children[0].text}x`,
                    [
                      ...prefix,
                      {_key: target._key},
                      'children',
                      {_key: target.children[0]._key},
                      'text',
                    ],
                  )
          editor.send({type: 'apply', patches: [patch]})
          states.push(text())
          editor.send({type: 'history.undo'})
          states.push(text())
          if (scenario === 'Q3 insert before removed') {
            expect(nodes().map((node: any) => node._key)).toEqual(
              depth === 'root'
                ? ['k8', 'k0', 'k2', 'k4']
                : depth === 'callout'
                  ? ['k9', 'k0', 'k2', 'k4']
                  : ['k11', 'k0', 'k2', 'k4'],
            )
          }
          editor.send({type: 'history.redo'})
          states.push(text())
          spy.mockRestore()
          console.warn(
            `Q34 ${safeStringify({scenario, depth, policy, states, errors})}`,
          )
          expect(errors).toEqual([])
          expect(states).toEqual(
            scenario === 'Q3 insert before removed'
              ? [
                  'foo|bar|baz',
                  'bar|baz',
                  'foo|bar|baz',
                  'foo|foo|bar|baz',
                  'foo|bar|baz',
                ]
              : scenario === 'Q3 move anchor removed'
                ? [
                    'foo|bar|baz',
                    'foo|baz|bar',
                    'baz|bar',
                    'bar|baz',
                    'baz|bar',
                  ]
                : scenario === 'Q4 move edited'
                  ? [
                      'foo|bar|baz',
                      'foo|baz|bar',
                      'foo|baz|barx',
                      policy === 'live' ? 'foo|barx|baz' : 'foo|bar|baz',
                      policy === 'live' ? 'foo|baz|barx' : 'foo|baz|bar',
                    ]
                  : [
                      'foo|bar|baz',
                      'foo|foo|bar|baz',
                      'foo|foox|bar|baz',
                      policy === 'live' ? 'foo|foox|bar|baz' : 'foo|bar|baz',
                      policy === 'live'
                        ? 'foo|foox|bar|baz'
                        : 'foo|foo|bar|baz',
                    ],
          )
          ;(globalThis as any).__historyLiveNodes = false
          ;(globalThis as any).__historyNeighbourPositions = true
        })
      }
    }
  }
}
