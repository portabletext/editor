import {applyAll, diffMatchPatch, type Patch} from '@portabletext/patches'
import {
  defineSchema,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/schema'
import type {ReactNode} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineContainer} from '../src'
import {NodePlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

function block(text: string) {
  return {
    _type: 'block',
    _key: 'a',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'a0', text, marks: []}],
  }
}

const containerSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
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
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    of: [
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        of: [defineContainer({type: 'cell', arrayField: 'content'})],
      }),
    ],
  }),
]

type Story = {
  name: string
  initialValue: Array<PortableTextBlock>
  textPath: Patch['path']
  schemaDefinition?: SchemaDefinition
  children?: ReactNode
}

const stories: Array<Story> = [
  {
    name: 'root',
    initialValue: [block('')],
    textPath: [{_key: 'a'}, 'children', {_key: 'a0'}, 'text'],
  },
  {
    name: 'callout',
    initialValue: [{_type: 'callout', _key: 'c', content: [block('')]}],
    textPath: [
      {_key: 'c'},
      'content',
      {_key: 'a'},
      'children',
      {_key: 'a0'},
      'text',
    ],
    schemaDefinition: containerSchema,
    children: <NodePlugin nodes={containers} />,
  },
  {
    name: 'table > row > cell',
    initialValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [{_type: 'cell', _key: 'c', content: [block('')]}],
          },
        ],
      },
    ],
    textPath: [
      {_key: 't'},
      'rows',
      {_key: 'r'},
      'cells',
      {_key: 'c'},
      'content',
      {_key: 'a'},
      'children',
      {_key: 'a0'},
      'text',
    ],
    schemaDefinition: containerSchema,
    children: <NodePlugin nodes={containers} />,
  },
]

describe('repro: undo across a remote insert at the same offset', () => {
  for (const story of stories) {
    test(`Scenario: ${story.name}`, async () => {
      const {editor} = await createTestEditor({
        initialValue: story.initialValue,
        schemaDefinition: story.schemaDefinition,
        children: story.children,
      })
      const at = {path: story.textPath.slice(0, -1), offset: 0}
      editor.send({type: 'select', at: {anchor: at, focus: at}})
      editor.send({type: 'insert.text', text: 'h1'})
      const local = applyAll(story.initialValue, [
        diffMatchPatch('', 'h1', story.textPath),
      ])
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.value).toEqual(local),
      )

      const remotePatch: Patch = {
        ...diffMatchPatch('h1', 'h2h1', story.textPath),
        origin: 'remote',
      }
      editor.send({
        type: 'apply',
        patches: [remotePatch],
      })
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.value).toEqual(
          applyAll(story.initialValue, [
            diffMatchPatch('', 'h2h1', story.textPath),
          ]),
        ),
      )

      const text = () =>
        JSON.stringify(editor.getSnapshot().context.value).match(
          /"text":"([^"]*)"/,
        )?.[1]
      editor.send({type: 'history.undo'})
      const afterUndo = text()
      editor.send({type: 'history.redo'})
      const afterRedo = text()
      console.warn(
        `REPRO ${story.name}: remote=h2h1 afterUndo=${afterUndo} afterRedo=${afterRedo}`,
      )
      expect({afterUndo, afterRedo}).toEqual({
        afterUndo: 'h2',
        afterRedo: 'h2h1',
      })
    })
  }
})
