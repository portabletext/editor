import {
  EditorProvider,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {PilcrowEditor} from '../src/editor'
import {schemaDefinition} from '../src/schema'

/**
 * Backspace at the start of a list-item merges its content into the
 * previous item's last text block. The merged content keeps its marks
 * (decorators) - flatten-to-string was the wrong shape.
 */

async function mount(initialValue: Array<PortableTextBlock>) {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition,
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PilcrowEditor />
    </EditorProvider>,
  )
  const locator = result.locator.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  if (!editorRef.current) {
    throw new Error('editor ref not set')
  }
  return {editor: editorRef.current, locator}
}

describe('Backspace merge preserves marks', () => {
  test('Backspace at start of second list-item with bold/italic merges marks intact', async () => {
    const initial = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [
              {
                _type: 'block',
                _key: 'B1',
                style: 'normal',
                children: [{_type: 'span', _key: 'S1', text: 'one', marks: []}],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'list-item',
            _key: 'I2',
            content: [
              {
                _type: 'block',
                _key: 'B2',
                style: 'normal',
                children: [
                  {_type: 'span', _key: 'S2a', text: 'plain ', marks: []},
                  {_type: 'span', _key: 'S2b', text: 'bold', marks: ['strong']},
                  {_type: 'span', _key: 'S2c', text: ' end', marks: []},
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, locator} = await mount(initial)
    await locator.element().focus()
    // Caret at start of B2 (= start of "plain ")
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'L1'},
            'items',
            {_key: 'I2'},
            'content',
            {_key: 'B2'},
            'children',
            {_key: 'S2a'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'L1'},
            'items',
            {_key: 'I2'},
            'content',
            {_key: 'B2'},
            'children',
            {_key: 'S2a'},
          ],
          offset: 0,
        },
      },
    })
    await new Promise((r) => setTimeout(r, 100))
    await userEvent.keyboard('{Backspace}')
    await new Promise((r) => setTimeout(r, 200))
    const value = editor.getSnapshot().context.value
    const list = value[0] as unknown as {
      items: Array<{
        content: Array<{children: Array<{text: string; marks: Array<string>}>}>
      }>
    }
    // After merge: one list-item left, with the merged text block having all spans
    expect(list.items).toHaveLength(1)
    const mergedBlock = list.items[0].content[0]
    // Spans should be: "one", "plain ", "bold"(strong), " end" or similar
    const texts = mergedBlock.children.map((c) => c.text).join('')
    expect(texts).toBe('oneplain bold end')
    // The bold span must have its 'strong' mark intact
    const boldSpan = mergedBlock.children.find((c) =>
      c.marks?.includes('strong'),
    )
    expect(boldSpan?.text).toBe('bold')
  })
})
