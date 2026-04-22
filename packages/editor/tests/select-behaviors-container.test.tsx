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

describe('abstract select behaviors — container awareness', () => {
  test('select.block at a line inside a code-block with select=end selects the end of that line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'barbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'select.block',
      at: [{_key: codeBlockKey}, 'lines', {_key: line2Key}],
      select: 'end',
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const endPoint = {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 6,
      }
      expect(selection).toEqual({
        anchor: endPoint,
        focus: endPoint,
        backward: false,
      })
    })
  })

  test('select.previous block from a line inside a code-block selects the previous line within the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    // Place caret in line 2.
    editor.send({
      type: 'select.block',
      at: [{_key: codeBlockKey}, 'lines', {_key: line2Key}],
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path.at(2)).toEqual({_key: line2Key})
    })

    editor.send({type: 'select.previous block'})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const line1Start = {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 0,
      }
      expect(selection).toEqual({
        anchor: line1Start,
        focus: line1Start,
        backward: false,
      })
    })
  })

  test('select.next block from a line inside a code-block selects the next line within the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'select.block',
      at: [{_key: codeBlockKey}, 'lines', {_key: line1Key}],
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path.at(2)).toEqual({_key: line1Key})
    })

    editor.send({type: 'select.next block'})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const line2Start = {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 0,
      }
      expect(selection).toEqual({
        anchor: line2Start,
        focus: line2Start,
        backward: false,
      })
    })
  })

  test('select.previous block from the first line of a code-block does not escape to root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootBlockKey = keyGenerator()
    const rootSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: rootBlockKey,
          children: [
            {_type: 'span', _key: rootSpanKey, text: 'root', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    // Caret inside container line 1.
    editor.send({
      type: 'select.block',
      at: [{_key: codeBlockKey}, 'lines', {_key: line1Key}],
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path.at(2)).toEqual({_key: line1Key})
    })

    const beforeSelection = editor.getSnapshot().context.selection

    editor.send({type: 'select.previous block'})

    // Give time for any event handling to settle.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // No previous sibling at container level → behavior is a no-op.
    expect(editor.getSnapshot().context.selection).toEqual(beforeSelection)
  })
})
