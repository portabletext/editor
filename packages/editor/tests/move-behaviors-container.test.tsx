import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

describe('abstract move behaviors — container awareness', () => {
  test('move.block down on the first line of a code-block swaps it with the second line within the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line1 = {
      _type: 'block' as const,
      _key: line1Key,
      children: [
        {_type: 'span' as const, _key: line1SpanKey, text: 'foo', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const line2 = {
      _type: 'block' as const,
      _key: line2Key,
      children: [
        {_type: 'span' as const, _key: line2SpanKey, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [line1, line2],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: codeBlockKey}, 'lines', {_key: line1Key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [line2, line1],
        },
      ])
    })
  })

  test('move.block up on the last line of a code-block swaps it with the previous line within the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line1 = {
      _type: 'block' as const,
      _key: line1Key,
      children: [
        {_type: 'span' as const, _key: line1SpanKey, text: 'foo', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const line2 = {
      _type: 'block' as const,
      _key: line2Key,
      children: [
        {_type: 'span' as const, _key: line2SpanKey, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [line1, line2],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: codeBlockKey}, 'lines', {_key: line2Key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [line2, line1],
        },
      ])
    })
  })

  test('move.block up on the first line of a code-block is a no-op (does not escape to root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line1 = {
      _type: 'block' as const,
      _key: line1Key,
      children: [
        {_type: 'span' as const, _key: line1SpanKey, text: 'foo', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const line2 = {
      _type: 'block' as const,
      _key: line2Key,
      children: [
        {_type: 'span' as const, _key: line2SpanKey, text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const initialValue = [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [line1, line2],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue,
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'move.block up',
      at: [{_key: codeBlockKey}, 'lines', {_key: line1Key}],
    })

    // Give time for any event handling to settle.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })
})
