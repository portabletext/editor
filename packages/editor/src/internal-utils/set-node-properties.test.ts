import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'
import type {EditorSchema} from '../editor/editor-schema'
import {createEditor} from '../engine/create-editor'
import type {Editor} from '../engine/interfaces/editor'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {
  resolveContainers,
  resolveContainersRich,
} from '../schema/resolve-containers-batch'
import {buildIndexMaps} from './build-index-maps'
import {setNodeProperties} from './set-node-properties'

test('throws when the path is structurally unreachable', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const markDefKey = keyGenerator()
  const newKey = keyGenerator()

  const schema = compileSchema(
    defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
  )
  const value: Array<PortableTextBlock> = [
    {
      _key: blockKey,
      _type: 'block',
      style: 'normal',
      markDefs: [
        {_key: markDefKey, _type: 'link', href: 'https://example.com/foo'},
      ],
      children: [
        {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
      ],
    },
  ]
  const editor = createBareEditor(schema, [], value)

  expect(() =>
    setNodeProperties(editor, {_key: newKey}, [
      {_key: blockKey},
      'markDefs',
      {_key: markDefKey},
    ]),
  ).toThrow('Unable to set properties at structurally unreachable path')
})

test('skips silently when the node is missing', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const schema = compileSchema(defineSchema({}))
  const value: Array<PortableTextBlock> = [
    {
      _key: blockKey,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
    },
  ]
  const editor = createBareEditor(schema, [], value)

  expect(() =>
    setNodeProperties(editor, {level: 1}, [{_key: 'nonexistent'}]),
  ).not.toThrow()
  expect(editor.snapshot.context.value).toEqual([
    {
      _key: blockKey,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
    },
  ])
})

test('applies the change through a container whose array field is named markDefs', () => {
  const keyGenerator = createTestKeyGenerator()
  const containerKey = keyGenerator()
  const childKey = keyGenerator()

  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'sidebar',
          fields: [
            {
              name: 'markDefs',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'note',
                  fields: [{name: 'title', type: 'string'}],
                },
              ],
            },
          ],
        },
      ],
    }),
  )
  const publicContainers: Array<Container> = [
    defineContainer({type: 'sidebar', arrayField: 'markDefs'}),
  ]
  const value: Array<PortableTextBlock> = [
    {
      _key: containerKey,
      _type: 'sidebar',
      markDefs: [{_key: childKey, _type: 'note', title: 'foo'}],
    },
  ]
  const editor = createBareEditor(schema, publicContainers, value)

  setNodeProperties(editor, {title: 'baz'}, [
    {_key: containerKey},
    'markDefs',
    {_key: childKey},
  ])

  expect(editor.snapshot.context.value).toEqual([
    {
      _key: containerKey,
      _type: 'sidebar',
      markDefs: [{_key: childKey, _type: 'note', title: 'baz'}],
    },
  ])
})

function createBareEditor(
  schema: EditorSchema,
  publicContainers: Array<Container>,
  value: Array<PortableTextBlock>,
): Editor {
  const editor = createEditor()
  const containers = resolveContainers(schema, publicContainers)
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})

  editor.containers = resolveContainersRich(schema, publicContainers)
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator: () => 'generated-key',
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  } as Editor['snapshot']

  return editor
}
