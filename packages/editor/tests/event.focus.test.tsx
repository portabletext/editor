import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent, type Locator} from 'vitest/browser'
import {useEditor, type Editor} from '../src'
import {createTestEditor} from '../src/test/vitest'
import {getTextSelection} from '../test-utils/text-selection'

describe('event.focus', () => {
  test('Scenario: Immediate focus after decorator toggle', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
        ],
      },
    ]

    // Given an editor with an immediate toolbar button
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
      children: <ToolbarBoldButton />,
    })

    // When "world" is selected in the DOM
    await performDomSelection(
      {editor, locator},
      {anchor: 6, focus: 11},
      'world',
    )

    // And the toolbar button is clicked
    const toolbarButton = page.getByTestId('toolbar-bold')
    await userEvent.click(toolbarButton)

    // Then the text is "hello ,world"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello ,world'])
    })

    // And "world" is selected
    await vi.waitFor(() => {
      const worldSelection = getTextSelection(
        editor.getSnapshot().context,
        'world',
      )
      expect(editor.getSnapshot().context.selection).toEqual(worldSelection)
    })

    // And "world" is selected in the DOM
    await vi.waitFor(() => {
      expect(document.getSelection()?.toString()).toBe('world')
    })
  })

  test('Scenario: Delayed focus after decorator toggle', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
        ],
      },
    ]

    // Given an editor with a delayed toolbar button
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
      children: <ToolbarBoldButtonDelayed />,
    })

    // When "world" is selected in the DOM
    await performDomSelection(
      {editor, locator},
      {anchor: 6, focus: 11},
      'world',
    )

    // And the toolbar button is clicked
    const toolbarButton = page.getByTestId('toolbar-bold-delayed')
    await userEvent.click(toolbarButton)

    // Then the text is "hello ,world"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello ,world'])
    })

    // And "world" is selected
    await vi.waitFor(() => {
      const worldSelection = getTextSelection(
        editor.getSnapshot().context,
        'world',
      )
      expect(editor.getSnapshot().context.selection).toEqual(worldSelection)
    })

    // And "world" is selected in the DOM
    await vi.waitFor(() => {
      expect(document.getSelection()?.toString()).toBe('world')
    })
  })
})

function ToolbarBoldButton() {
  const editor = useEditor()

  return (
    <button
      type="button"
      data-testid="toolbar-bold"
      onClick={() => {
        editor.send({
          type: 'decorator.toggle',
          decorator: 'strong',
        })
        editor.send({type: 'focus'})
      }}
    >
      Bold
    </button>
  )
}

function ToolbarBoldButtonDelayed() {
  const editor = useEditor()

  return (
    <button
      type="button"
      data-testid="toolbar-bold-delayed"
      onClick={() => {
        editor.send({
          type: 'decorator.toggle',
          decorator: 'strong',
        })
        setTimeout(() => {
          editor.send({type: 'focus'})
        }, 150)
      }}
    >
      Bold
    </button>
  )
}

async function performDomSelection(
  context: {
    editor: Editor
    locator: Locator
  },
  offsets: {anchor: number; focus: number},
  text: string,
) {
  const editorEl = context.locator.element() as HTMLElement
  const textNode = editorEl.querySelector('[data-slate-string]')?.childNodes[0]

  if (!textNode) {
    throw new Error('Could not find text node in editor')
  }

  editorEl.focus()

  document
    .getSelection()!
    .setBaseAndExtent(textNode, offsets.anchor, textNode, offsets.focus)

  await vi.waitFor(() => {
    const selection = getTextSelection(
      context.editor.getSnapshot().context,
      text,
    )
    expect(context.editor.getSnapshot().context.selection).toEqual(selection)
  })
}
