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
import {PilcrowEditor} from '../src/editor'
import {schemaDefinition} from '../src/schema'
import {Toolbar} from '../src/toolbar'

/**
 * TDD coverage for the toolbar list-toggle buttons:
 * - In a normal paragraph: button wraps the block in a list of the given kind.
 * - Inside a list of the same kind: button unwraps the list-item back to a
 *   normal paragraph.
 * - Inside a list of a different kind: button changes the enclosing list's
 *   kind in place.
 * - In all cases the active state (aria-pressed) reflects whether the focus
 *   is inside a list of the button's kind.
 */

async function mount(initialValue?: Array<PortableTextBlock>) {
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
      <Toolbar />
      <PilcrowEditor />
    </EditorProvider>,
  )
  const locator = result.locator.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  if (!editorRef.current) {
    throw new Error('editor ref not set')
  }
  return {editor: editorRef.current, locator, container: result.container}
}

function paragraphBlock(_key: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key,
    style: 'normal',
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}

describe('list toolbar buttons', () => {
  test("aria-pressed reflects whether caret is inside a list of the button's kind", async () => {
    const initial = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [paragraphBlock('B1', 'S1', 'hello')],
          },
        ],
      },
      paragraphBlock('B2', 'S2', 'plain'),
    ] as Array<PortableTextBlock>
    const {editor, container} = await mount(initial)
    const bulletBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Bullet list"]',
    )!
    const numberBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Numbered list"]',
    )!

    // Place caret inside the bullet list item.
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
    await vi.waitFor(() =>
      expect(bulletBtn.getAttribute('aria-pressed')).toBe('true'),
    )
    expect(numberBtn.getAttribute('aria-pressed')).toBe('false')

    // Move caret to the plain paragraph.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'B2'}, 'children', {_key: 'S2'}], offset: 0},
        focus: {path: [{_key: 'B2'}, 'children', {_key: 'S2'}], offset: 0},
      },
    })
    await vi.waitFor(() =>
      expect(bulletBtn.getAttribute('aria-pressed')).toBe('false'),
    )
    expect(numberBtn.getAttribute('aria-pressed')).toBe('false')
  })

  test('click bullet button on plain paragraph wraps it in a bullet list', async () => {
    const initial = [
      paragraphBlock('B1', 'S1', 'hello'),
    ] as Array<PortableTextBlock>
    const {editor, container} = await mount(initial)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'B1'}, 'children', {_key: 'S1'}], offset: 0},
        focus: {path: [{_key: 'B1'}, 'children', {_key: 'S1'}], offset: 0},
      },
    })
    const bulletBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Bullet list"]',
    )!
    bulletBtn.click()
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(1)
      expect((value[0] as {_type: string})._type).toBe('list')
    })
    const value = editor.getSnapshot().context.value
    expect((value[0] as unknown as {kind: string}).kind).toBe('bullet')
  })

  test('click bullet button inside bullet list-item unwraps it back to plain paragraph', async () => {
    const initial = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [paragraphBlock('B1', 'S1', 'hello')],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, container} = await mount(initial)
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
    const bulletBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Bullet list"]',
    )!
    await vi.waitFor(() =>
      expect(bulletBtn.getAttribute('aria-pressed')).toBe('true'),
    )
    bulletBtn.click()
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect((value[0] as {_type: string})._type).toBe('block')
    })
    const value = editor.getSnapshot().context.value
    expect(value).toHaveLength(1)
    expect((value[0] as {_type: string; style: string}).style).toBe('normal')
  })

  test('click number button inside bullet list-item changes the list kind to number', async () => {
    const initial = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [paragraphBlock('B1', 'S1', 'hello')],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, container} = await mount(initial)
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
    const numberBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Numbered list"]',
    )!
    const bulletBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Bullet list"]',
    )!
    // Wait for aria-pressed to reflect caret-inside-bullet-list before clicking
    await vi.waitFor(() =>
      expect(bulletBtn.getAttribute('aria-pressed')).toBe('true'),
    )
    numberBtn.click()
    await new Promise((r) => setTimeout(r, 200))
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect((value[0] as unknown as {kind: string}).kind).toBe('number')
    })
  })
})
