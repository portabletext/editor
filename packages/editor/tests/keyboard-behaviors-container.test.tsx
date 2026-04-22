import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
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

describe('abstract keyboard behaviors — container awareness', () => {
  test('Shift+ArrowLeft at start of empty line after a non-empty line inside a container extends selection to end of previous line', async () => {
    // The abstract keyboard Shift+ArrowLeft guard uses the root-only
    // `getFocusBlock` + `getPreviousBlock` selectors to detect a selection
    // hanging onto an empty text block. Inside a container, those selectors
    // return undefined → guard doesn't fire → Shift+ArrowLeft inside the
    // container is a no-op on an empty line at offset 0.
    //
    // Expected after the container-aware swap: selection extends from offset
    // 0 of the empty line 2 back to the end of line 1 (offset 3, after
    // 'foo').
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
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const emptyLine2Point = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: emptyLine2Point, focus: emptyLine2Point},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toEqual(0)
      expect(editor.getSnapshot().context.selection?.focus.path.at(2)).toEqual({
        _key: line2Key,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.anchor).toEqual(emptyLine2Point)
      expect(selection?.focus).toEqual({
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 3,
      })
    })
  })

  test('Shift+ArrowLeft at start of empty root text block after a non-empty root text block still extends selection to end of previous block', async () => {
    // Root-level regression guard for the same guard: the behavior used to
    // go through root-only `getFocusBlock` + `getPreviousBlock`. After the
    // swap to depth-agnostic `getFocusTextBlock` + `getSibling`, the
    // root-level case must keep working.
    const rootSchemaDefinition = defineSchema({})
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: rootSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    const emptyBlock2Point = {
      path: [{_key: block2Key}, 'children', {_key: span2Key}],
      offset: 0,
    }

    editor.send({
      type: 'select',
      at: {anchor: emptyBlock2Point, focus: emptyBlock2Point},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toEqual(0)
    })

    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.anchor).toEqual(emptyBlock2Point)
      expect(selection?.focus).toEqual({
        path: [{_key: block1Key}, 'children', {_key: span1Key}],
        offset: 3,
      })
    })
  })
})
