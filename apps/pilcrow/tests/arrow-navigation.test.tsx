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
 * Arrow navigation should let the caret leave a list when there is a
 * block after (ArrowDown) or before (ArrowUp) the list at the parent
 * level. Reported symptom: arrow navigation gets stuck inside list-
 * items so you can't reach surrounding paragraphs by keyboard.
 *
 * The engine's \`arrowDownOutOfContainer\` / \`arrowUpOutOfContainer\`
 * behaviors were treating "no sibling at the innermost container" as a
 * dead-end, suppressing the native arrow event. With nested containers
 * (list > list-item > content > block) the innermost container is the
 * list-item, whose siblings are other list-items - so being at the last
 * list-item was wrongly flagged as a dead-end even when the list itself
 * had a next sibling.
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

function block(_key: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key,
    style: 'normal' as const,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}

describe('arrow navigation in/out of list-items', () => {
  test('ArrowDown from last list-item lands in the paragraph after the list', async () => {
    const initial = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [block('B1', 'S1', 'item one')],
          },
          {
            _type: 'list-item',
            _key: 'I2',
            content: [block('B2', 'S2', 'item two')],
          },
        ],
      },
      block('B3', 'S3', 'after list'),
    ] as Array<PortableTextBlock>
    const {editor, locator} = await mount(initial)
    // Place caret at end of last list-item.
    await locator.element().focus()
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
            {_key: 'S2'},
          ],
          offset: 'item two'.length,
        },
        focus: {
          path: [
            {_key: 'L1'},
            'items',
            {_key: 'I2'},
            'content',
            {_key: 'B2'},
            'children',
            {_key: 'S2'},
          ],
          offset: 'item two'.length,
        },
      },
    })
    await new Promise((r) => setTimeout(r, 100))
    await userEvent.keyboard('{ArrowDown}')
    await new Promise((r) => setTimeout(r, 150))
    const sel = editor.getSnapshot().context.selection
    expect(sel?.focus.path.at(-1)).toEqual({_key: 'S3'})
  })

  test('ArrowUp from first list-item lands in the paragraph before the list', async () => {
    const initial = [
      block('B0', 'S0', 'before list'),
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [block('B1', 'S1', 'item one')],
          },
          {
            _type: 'list-item',
            _key: 'I2',
            content: [block('B2', 'S2', 'item two')],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, locator} = await mount(initial)
    await locator.element().focus()
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
          offset: 0,
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
          offset: 0,
        },
      },
    })
    await new Promise((r) => setTimeout(r, 100))
    await userEvent.keyboard('{ArrowUp}')
    await new Promise((r) => setTimeout(r, 150))
    const sel = editor.getSnapshot().context.selection
    expect(sel?.focus.path.at(-1)).toEqual({_key: 'S0'})
  })
})
