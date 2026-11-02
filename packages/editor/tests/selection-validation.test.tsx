import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {defineSchema, EditorProvider, PortableTextEditable} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
  },
]

const anchor = {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0}
const focus = {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3}

function findTextNode(root: Node, text: string): Node | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (walker.currentNode.textContent === text) {
      return walker.currentNode
    }
  }
  return null
}

/**
 * The MutationObserver driving selection validation fires on childList
 * mutations. Its callback is queued as a microtask before this function's
 * continuation, so awaiting once lets the validation pass run first.
 */
async function triggerSelectionValidation(editorElement: Element) {
  editorElement.appendChild(document.createComment('mutation'))
  await Promise.resolve()
}

describe('selection validation', () => {
  test('Scenario: An equivalent DOM selection representation is left alone', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    await userEvent.click(locator)
    editor.send({type: 'select', at: {anchor, focus}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
    })

    const editorElement = locator.element()
    const textNode = findTextNode(editorElement, 'foo')
    const parent = textNode?.parentNode
    expect(parent).not.toBeNull()
    const index = Array.prototype.indexOf.call(parent!.childNodes, textNode)

    // The same selection ("foo", offsets 0..3) expressed with element-level
    // endpoints, the way browsers represent a selection swept across table
    // cells.
    window.getSelection()?.setBaseAndExtent(parent!, index, parent!, index + 1)

    await triggerSelectionValidation(editorElement)

    const domSelection = window.getSelection()
    expect(domSelection?.anchorNode).toBe(parent)
    expect(domSelection?.anchorOffset).toBe(index)
    expect(domSelection?.focusNode).toBe(parent)
    expect(domSelection?.focusOffset).toBe(index + 1)
    expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
  })

  test('Scenario: A DOM selection that means something else is rewritten', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    await userEvent.click(locator)
    editor.send({type: 'select', at: {anchor, focus}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
    })

    const editorElement = locator.element()
    const textNode = findTextNode(editorElement, 'foo')
    const parent = textNode?.parentNode
    expect(parent).not.toBeNull()

    // A collapsed selection at the block start disagrees with the model's
    // 0..3 range.
    window.getSelection()?.setBaseAndExtent(parent!, 0, parent!, 0)

    await triggerSelectionValidation(editorElement)

    const domSelection = window.getSelection()
    expect(domSelection?.focusNode).toBe(textNode)
    expect(domSelection?.focusOffset).toBe(3)
  })

  test('Scenario: An action set that swaps a block keeps selection on the new block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()
    const newBlockKey = 'newBlock'
    const newSpanKey = 'newSpan'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.swap-image',
              actions: [
                () => [
                  execute({
                    type: 'insert.block',
                    block: {
                      _key: newBlockKey,
                      _type: 'block',
                      children: [
                        {_key: newSpanKey, _type: 'span', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    placement: 'after',
                    select: 'start',
                  }),
                  execute({
                    type: 'delete.block',
                    at: [{_key: imageKey}],
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.anchor.path).toEqual([
        {_key: imageKey},
      ])
    })

    editor.send({type: 'custom.swap-image'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: newBlockKey,
          _type: 'block',
          children: [{_key: newSpanKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      backward: false,
    })
  })

  test('Scenario: Unmounting the editable disconnects its mutation observer', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    onTestFinished(() => {
      observe.mockRestore()
      disconnect.mockRestore()
    })

    const renderResult = await render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <PortableTextEditable data-testid="editable" />
      </EditorProvider>,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    const editorElement = page.getByTestId('editable').element()

    const editorObservers = observe.mock.contexts.filter(
      (_observer, index) => observe.mock.calls[index]?.[0] === editorElement,
    )
    expect(
      editorObservers.filter(
        (observer) => !disconnect.mock.contexts.includes(observer),
      ),
    ).toHaveLength(1)

    await renderResult.unmount()

    expect(
      editorObservers.filter(
        (observer) => !disconnect.mock.contexts.includes(observer),
      ),
    ).toEqual([])
  })

  test('Scenario: Unmounting the editable clears the ref passed to it', async () => {
    const editableRef = createRef<HTMLDivElement>()

    const renderResult = await render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <PortableTextEditable ref={editableRef} data-testid="editable" />
      </EditorProvider>,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    expect(editableRef.current).toBe(page.getByTestId('editable').element())

    await renderResult.unmount()

    expect(editableRef.current).toEqual(null)
  })

  test('Scenario: A callback ref passed to the editable receives `null` when the element detaches', async () => {
    const events: Array<[string, HTMLDivElement | null]> = []
    const firstRef = (node: HTMLDivElement | null) => {
      events.push(['first', node])
    }
    const secondRef = (node: HTMLDivElement | null) => {
      events.push(['second', node])
    }
    const initialConfig = {
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
    }

    const renderResult = await render(
      <EditorProvider initialConfig={initialConfig}>
        <PortableTextEditable ref={firstRef} data-testid="editable" />
      </EditorProvider>,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    const editorElement = page.getByTestId('editable').element()

    expect(events).toEqual([
      ['first', editorElement],
      ['first', null],
      ['first', editorElement],
    ])

    await renderResult.rerender(
      <EditorProvider initialConfig={initialConfig}>
        <PortableTextEditable ref={secondRef} data-testid="editable" />
      </EditorProvider>,
    )

    expect(events).toEqual([
      ['first', editorElement],
      ['first', null],
      ['first', editorElement],
      ['first', null],
      ['second', editorElement],
    ])

    await renderResult.unmount()

    expect(events).toEqual([
      ['first', editorElement],
      ['first', null],
      ['first', editorElement],
      ['first', null],
      ['second', editorElement],
      ['second', null],
    ])
  })

  test('Scenario: A callback ref passed to the editable has its returned cleanup run when the element detaches', async () => {
    const events: Array<[string, HTMLDivElement | null]> = []
    const firstRef = (node: HTMLDivElement | null) => {
      events.push(['first', node])
      return () => {
        events.push(['first cleanup', node])
      }
    }
    const secondRef = (node: HTMLDivElement | null) => {
      events.push(['second', node])
      return () => {
        events.push(['second cleanup', node])
      }
    }
    const initialConfig = {
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
    }

    const renderResult = await render(
      <EditorProvider initialConfig={initialConfig}>
        <PortableTextEditable ref={firstRef} data-testid="editable" />
      </EditorProvider>,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    const editorElement = page.getByTestId('editable').element()

    expect(events).toEqual([
      ['first', editorElement],
      ['first cleanup', editorElement],
      ['first', editorElement],
    ])

    await renderResult.rerender(
      <EditorProvider initialConfig={initialConfig}>
        <PortableTextEditable ref={secondRef} data-testid="editable" />
      </EditorProvider>,
    )

    expect(events).toEqual([
      ['first', editorElement],
      ['first cleanup', editorElement],
      ['first', editorElement],
      ['first cleanup', editorElement],
      ['second', editorElement],
    ])

    await renderResult.unmount()

    expect(events).toEqual([
      ['first', editorElement],
      ['first cleanup', editorElement],
      ['first', editorElement],
      ['first cleanup', editorElement],
      ['second', editorElement],
      ['second cleanup', editorElement],
    ])
  })
})
