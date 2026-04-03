import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type React from 'react'
import type {RefObject} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {Editor} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {createTestEditor} from '../src/test/vitest'

/**
 * Simulates what `useDecoratorButton` from `@portabletext/toolbar` does
 * when a toolbar button is clicked: it sends `decorator.toggle` followed
 * by `focus` synchronously within the click handler.
 *
 * When the user clicks this button, the browser moves focus from the
 * editor to the button (on mousedown), then the click handler fires and
 * sends both events. The editor must restore the selection after
 * re-focusing.
 */
function ToolbarBoldButton({editorRef}: {editorRef: RefObject<Editor | null>}) {
  return (
    <button
      type="button"
      data-testid="toolbar-bold"
      onClick={() => {
        editorRef.current?.send({
          type: 'decorator.toggle',
          decorator: 'strong',
        })
        editorRef.current?.send({type: 'focus'})
      }}
    >
      Bold
    </button>
  )
}

/**
 * Like ToolbarBoldButton, but delays the `focus` event by 150ms.
 *
 * This reproduces a Firefox-specific bug: after `decorator.toggle`
 * modifies the Slate tree and React re-renders the DOM (replacing span
 * nodes), Firefox collapses the DOM selection to offset 0 because the
 * nodes it was anchored to no longer exist. The `onDOMSelectionChange`
 * handler - throttled at 100ms - eventually syncs this collapsed
 * selection back to Slate. If the `focus` event arrives after that sync,
 * `handle focus` reads the corrupted Slate selection (offset 0) and
 * "restores" it there, moving the cursor to the start of the block.
 *
 * The synchronous `decorator.toggle` + `focus` path avoids this because
 * the `'slate is busy'` guard delays focus by only 10ms - well within
 * the 100ms throttle window. But if anything in the toolbar's event
 * handling chain introduces enough delay (React Aria's press handling,
 * XState actor communication, React batching), the selection is lost.
 */
function ToolbarBoldButtonDelayed({
  editorRef,
}: {
  editorRef: RefObject<Editor | null>
}) {
  return (
    <button
      type="button"
      data-testid="toolbar-bold-delayed"
      onClick={() => {
        editorRef.current?.send({
          type: 'decorator.toggle',
          decorator: 'strong',
        })
        setTimeout(() => {
          editorRef.current?.send({type: 'focus'})
        }, 150)
      }}
    >
      Bold
    </button>
  )
}

async function setupEditor(
  children: React.ReactNode,
  editorRef: RefObject<Editor | null>,
) {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const initialValue = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: spanKey,
          text: 'hello world',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  const result = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    initialValue,
    children: (
      <>
        <EditorRefPlugin ref={editorRef} />
        {children}
      </>
    ),
  })

  await userEvent.click(result.locator.getByText('hello world'))
  await vi.waitFor(() => {
    expect(result.editor.getSnapshot().context.selection).not.toBeNull()
  })

  return result
}

function selectWorldInEditor(locator: {element: () => Element | null}) {
  const editorEl = locator.element() as HTMLElement
  const textNode = editorEl.querySelector('[data-slate-string]')?.childNodes[0]

  if (!textNode) {
    throw new Error('Could not find text node in editor')
  }

  document.getSelection()!.setBaseAndExtent(textNode, 6, textNode, 11)
}

describe('toolbar decorator selection', () => {
  test('selection is preserved after toggling decorator via toolbar button', async () => {
    const editorRef: RefObject<Editor | null> = {current: null}
    const {editor, locator} = await setupEditor(
      <ToolbarBoldButton editorRef={editorRef} />,
      editorRef,
    )

    const toolbarButton = page.getByTestId('toolbar-bold')
    await vi.waitFor(() => expect.element(toolbarButton).toBeInTheDocument())

    await selectWorldInEditor(locator)

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.anchor.offset).toBe(6)
      expect(selection?.focus.offset).toBe(11)
    })

    await userEvent.click(toolbarButton)

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value?.[0] as {
        children: Array<{text: string; marks?: Array<string>}>
      }
      expect(block.children).toHaveLength(2)
      expect(block.children[1]?.text).toBe('world')
      expect(block.children[1]?.marks).toEqual(['strong'])
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).not.toBeNull()
      expect(selection!.anchor.offset).not.toBe(selection!.focus.offset)
      expect(document.getSelection()?.toString()).toBe('world')
    })
  })

  test('Firefox: selection is lost when focus arrives after selectionchange throttle', async () => {
    const editorRef: RefObject<Editor | null> = {current: null}
    const {editor, locator} = await setupEditor(
      <ToolbarBoldButtonDelayed editorRef={editorRef} />,
      editorRef,
    )

    const toolbarButton = page.getByTestId('toolbar-bold-delayed')
    await vi.waitFor(() => expect.element(toolbarButton).toBeInTheDocument())

    await selectWorldInEditor(locator)

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.anchor.offset).toBe(6)
      expect(selection?.focus.offset).toBe(11)
    })

    await userEvent.click(toolbarButton)

    // The decorator should still be applied correctly regardless of
    // focus timing - the toggle uses the Slate selection which is
    // still valid at that point.
    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value?.[0] as {
        children: Array<{text: string; marks?: Array<string>}>
      }
      expect(block.children).toHaveLength(2)
      expect(block.children[1]?.text).toBe('world')
      expect(block.children[1]?.marks).toEqual(['strong'])
    })

    // On Firefox, this fails: the selection collapses to offset 0
    // (start of block) because onDOMSelectionChange synced Firefox's
    // corrupted DOM selection to Slate before handle focus ran.
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).not.toBeNull()
      expect(selection!.anchor.offset).not.toBe(selection!.focus.offset)
      expect(document.getSelection()?.toString()).toBe('world')
    })
  })
})
