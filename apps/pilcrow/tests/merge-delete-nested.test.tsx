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
 * Delete at the end of a list-item's last text block merges with the
 * NEXT list-item. When the next item starts with a NESTED LIST instead
 * of a text block, walk the nested list's first leading text block and
 * merge that. Marks survive across the merge.
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

describe('Delete-merge across list-items', () => {
  test('Delete at end of last block merges nested list leading text block, marks preserved', async () => {
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
                children: [
                  {_type: 'span', _key: 'S1', text: 'first', marks: []},
                ],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'list-item',
            _key: 'I2',
            content: [
              {
                _type: 'list',
                _key: 'L2',
                kind: 'bullet',
                items: [
                  {
                    _type: 'list-item',
                    _key: 'I2A',
                    content: [
                      {
                        _type: 'block',
                        _key: 'B2A',
                        style: 'normal',
                        children: [
                          {
                            _type: 'span',
                            _key: 'S2A',
                            text: 'nested ',
                            marks: [],
                          },
                          {
                            _type: 'span',
                            _key: 'S2B',
                            text: 'bold',
                            marks: ['strong'],
                          },
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, locator} = await mount(initial)
    await locator.element().focus()
    // Caret at end of B1 (offset 5 = end of "first")
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'L1'},
            'items',
            {_key: 'I1'},
            'content',
            {_key: 'B1'},
            'children',
            {_key: 'S1'},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: 'L1'},
            'items',
            {_key: 'I1'},
            'content',
            {_key: 'B1'},
            'children',
            {_key: 'S1'},
          ],
          offset: 5,
        },
      },
    })
    await new Promise((r) => setTimeout(r, 100))
    await userEvent.keyboard('{Delete}')
    await new Promise((r) => setTimeout(r, 200))
    const value = editor.getSnapshot().context.value
    const list = value[0] as unknown as {
      items: Array<{
        content: Array<{
          children?: Array<{text: string; marks?: Array<string>}>
        }>
      }>
    }
    // After merge: the nested list-item's content should be folded into
    // B1, and the I2 list-item should be removed. So one list-item left.
    expect(list.items).toHaveLength(1)
    const mergedBlock = list.items[0].content[0]
    const texts = (mergedBlock.children ?? []).map((c) => c.text).join('')
    expect(texts).toBe('firstnested bold')
    // The bold span keeps its mark
    const boldSpan = (mergedBlock.children ?? []).find((c) =>
      c.marks?.includes('strong'),
    )
    expect(boldSpan?.text).toBe('bold')
  })
})
