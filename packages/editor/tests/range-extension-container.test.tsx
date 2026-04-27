import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
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

describe('Cross-line selection inside an editable container', () => {
  test('a DOM range spanning line 1 and line 2 resolves to a cross-line Slate selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
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

    await userEvent.click(locator)

    // Simulate a browser-initiated range selection (e.g. Shift+ArrowRight
    // across lines or a mouse drag) by directly manipulating the DOM
    // selection. The editor's `selectionchange` handler should convert it
    // to a cross-line Slate selection via `toSlateRange`.
    const editable = locator.element() as HTMLElement
    const textNodes = editable.querySelectorAll(
      '[data-slate-node="text"], [data-child-type="span"]',
    )
    const line1TextNode = textNodes[0] as HTMLElement
    const line2TextNode = textNodes[1] as HTMLElement
    const line1StringNode = line1TextNode.querySelector('[data-slate-string]')
      ?.childNodes[0]
    const line2StringNode = line2TextNode.querySelector('[data-slate-string]')
      ?.childNodes[0]

    expect(line1StringNode).toBeTruthy()
    expect(line2StringNode).toBeTruthy()

    const selection = document.getSelection()!
    const range = document.createRange()
    range.setStart(line1StringNode!, 3)
    range.setEnd(line2StringNode!, 0)
    selection.removeAllRanges()
    selection.addRange(range)

    // selectionchange handler is throttled
    await new Promise((resolve) => setTimeout(resolve, 200))

    const snapshot = editor.getSnapshot()

    expect(snapshot.context.selection).toEqual({
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line1Key},
          'children',
          {_key: line1SpanKey},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 0,
      },
      backward: false,
    })
  })

  test('ArrowRight from end of line 1 moves caret to start of line 2', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
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

    await userEvent.click(locator)

    const endOfLine1 = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
        'children',
        {_key: line1SpanKey},
      ],
      offset: 3,
    }

    editor.send({
      type: 'select',
      at: {anchor: endOfLine1, focus: endOfLine1},
    })

    await userEvent.keyboard('{ArrowRight}')

    const startOfLine2 = {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: line2SpanKey},
      ],
      offset: 0,
    }

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: startOfLine2,
      focus: startOfLine2,
      backward: false,
    })
  })
})
