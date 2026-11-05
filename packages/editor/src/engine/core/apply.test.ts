import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {resolveContainersRich} from '../../schema/resolve-containers-batch'
import {getNode} from '../../traversal/get-node'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../../traversal/node-traversal-testbed'
import type {PortableTextEditorEngine} from '../../types/editor-engine'
import {createEditor} from '../create-editor'
import {apply} from './apply'

describe.each(textBlockDepths)(
  `${apply.name} with a compact path to a text block %s`,
  (depth) => {
    test.each(
      createTextBlockDepthTestbed(depth).compactSpanPaths.map(({form}) => ({
        form,
      })),
    )('an `unset` at a compact span path ($form) is dropped', ({form}) => {
      const testbed = createTextBlockDepthTestbed(depth)
      const editor = createBareEditor(testbed)
      const {path} = testbed.compactSpanPaths.find(
        (compact) => compact.form === form,
      )!
      const value = editor.snapshot.context.value

      apply(editor, {type: 'unset', path})

      expect(editor.snapshot.context.value).toBe(value)
      expect(editor.operations).toEqual([])
    })

    test.each(
      createTextBlockDepthTestbed(depth).compactSpanPaths.map(({form}) => ({
        form,
      })),
    )(
      'a `set.selection` to a compact span path ($form) is dropped',
      ({form}) => {
        const testbed = createTextBlockDepthTestbed(depth)
        const editor = createBareEditor(testbed)
        const {path} = testbed.compactSpanPaths.find(
          (compact) => compact.form === form,
        )!

        apply(editor, {
          type: 'set.selection',
          properties: null,
          newProperties: {
            anchor: {path, offset: 0},
            focus: {path, offset: 0},
          },
        })

        expect(editor.snapshot.context.selection).toEqual(null)
        expect(editor.operations).toEqual([])
      },
    )

    test('an `unset` at the full span path removes the span', () => {
      const testbed = createTextBlockDepthTestbed(depth)
      const editor = createBareEditor(testbed)

      apply(editor, {type: 'unset', path: testbed.spanPath})

      expect(getNode(editor.snapshot, testbed.blockPath)?.node).toEqual({
        _key: testbed.textBlock._key,
        _type: testbed.textBlock._type,
        children: [testbed.barSpan],
        markDefs: [],
        style: 'normal',
      })
    })
  },
)

function createBareEditor(
  testbed: ReturnType<typeof createTextBlockDepthTestbed>,
): PortableTextEditorEngine {
  const {schema, containers, value} = testbed.snapshot.context
  const editor = createEditor() as PortableTextEditorEngine

  editor.containers = resolveContainersRich(schema, testbed.publicContainers)
  editor.blockIndexMap = new Map(testbed.snapshot.blockIndexMap)
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator: createTestKeyGenerator('generated-'),
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  } as PortableTextEditorEngine['snapshot']

  return editor
}
