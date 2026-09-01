import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

// Focusing an empty editor emits `focused` and then programmatically sets the
// selection (`handleOnFocus` -> `editorEngine.select`). On Firefox that
// selection-set on a freshly-focused empty contenteditable transiently blurs
// and re-focuses the element, so the DOM event stream is
// `focused -> blurred -> focused`. The settled last event is `focused`, but
// under CI load it can arrive well after the default 1s `vi.waitFor` window,
// so the wait exhausts on the transient `blurred`. Give the focus waits (and
// the tests themselves) enough headroom to reach the settled state.
const FOCUS_SETTLE = {timeout: 10_000, interval: 100} as const
const TEST_TIMEOUT = 40_000

describe('focus', () => {
  test(
    'Scenario: Focusing on an empty editor',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const focusEvents: Array<EditorEmittedEvent['type']> = []

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        children: (
          <>
            <button type="button" data-testid="toolbar">
              Toolbar
            </button>
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'focused' || event.type === 'blurred') {
                  focusEvents.push(event.type)
                }
              }}
            />
          </>
        ),
      })

      const expectedSelection = {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        backward: false,
      }

      const toolbarLocator = page.getByTestId('toolbar')
      await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

      await userEvent.click(locator)

      // Wait for both focus and selection to settle.
      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
        expect(editor.getSnapshot().context.selection).toEqual(
          expectedSelection,
        )
      }, FOCUS_SETTLE)

      await userEvent.click(toolbarLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('blurred')
      }, FOCUS_SETTLE)

      await userEvent.click(locator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
        expect(editor.getSnapshot().context.selection).toEqual(
          expectedSelection,
        )
      }, FOCUS_SETTLE)
    },
  )

  test(
    'Scenario: Focusing on a non-empty editor',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const focusEvents: Array<EditorEmittedEvent['type']> = []
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const initialValue = [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [
            {
              _type: 'span',
              _key: fooSpanKey,
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [
            {
              _type: 'span',
              _key: barSpanKey,
              text: 'b',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue,
        children: (
          <>
            <button type="button" data-testid="toolbar">
              Toolbar
            </button>
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'focused' || event.type === 'blurred') {
                  focusEvents.push(event.type)
                }
              }}
            />
          </>
        ),
      })

      const barSpanLocator = locator.getByText('b')
      const toolbarLocator = page.getByTestId('toolbar')
      await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())
      await vi.waitFor(() => expect.element(toolbarLocator).toBeInTheDocument())

      await userEvent.click(barSpanLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
      }, FOCUS_SETTLE)

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          backward: false,
        })
      }, FOCUS_SETTLE)

      await userEvent.click(toolbarLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('blurred')
      }, FOCUS_SETTLE)

      await userEvent.click(barSpanLocator)

      await vi.waitFor(() => {
        expect(focusEvents.at(-1)).toEqual('focused')
      }, FOCUS_SETTLE)

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 0,
          },
          backward: false,
        })
      }, FOCUS_SETTLE)
    },
  )
})

describe('focus trap recovery', () => {
  test(
    'Scenario: a focus trap steals focus back exactly once, and the editor reports itself honestly unfocused',
    {timeout: TEST_TIMEOUT},
    async () => {
      const onWindowError = vi.fn()
      window.addEventListener('error', onWindowError)

      try {
        let steals = 0

        const {editor, locator} = await createTestEditor({
          keyGenerator: createTestKeyGenerator(),
          children: <FocusTrap onSteal={() => steals++} />,
        })

        const trapLocator = page.getByTestId('trap')

        await userEvent.click(trapLocator)
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(trapLocator.element()),
        )

        editor.send({type: 'focus'})

        await vi.waitFor(() => expect(steals).toBe(1))
        expect(document.activeElement).toBe(trapLocator.element())
        expect(document.activeElement).not.toBe(locator.element())
        expect(onWindowError).not.toHaveBeenCalled()

        // A regression that retries against the trap drives `steals` past
        // 1 within this window.
        await new Promise((resolve) => setTimeout(resolve, 100))
        expect(steals).toBe(1)
      } finally {
        window.removeEventListener('error', onWindowError)
      }
    },
  )

  test(
    'Scenario: a persistent focus trap gives up after one steal, and a later send recovers once the trap releases',
    {timeout: TEST_TIMEOUT},
    async () => {
      const onWindowError = vi.fn()
      window.addEventListener('error', onWindowError)

      try {
        let steals = 0

        const {editor, locator} = await createTestEditor({
          keyGenerator: createTestKeyGenerator(),
          children: <FocusTrap onSteal={() => steals++} />,
        })

        const trapLocator = page.getByTestId('trap')
        const releaseTrapLocator = page.getByTestId('release-trap')

        await userEvent.click(trapLocator)
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(trapLocator.element()),
        )

        editor.send({type: 'focus'})

        await vi.waitFor(() => expect(steals).toBe(1))
        expect(document.activeElement).toBe(trapLocator.element())
        expect(document.activeElement).not.toBe(locator.element())
        expect(onWindowError).not.toHaveBeenCalled()

        await userEvent.click(releaseTrapLocator)

        editor.send({type: 'focus'})

        await vi.waitFor(() => {
          expect(document.activeElement).toBe(locator.element())
        }, FOCUS_SETTLE)
      } finally {
        window.removeEventListener('error', onWindowError)
      }
    },
  )

  test(
    'Scenario: an inert container blocks focus, and releasing it lets focus land',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const editorRef = React.createRef<Editor>()
      const containerRef = React.createRef<HTMLDivElement>()
      const focusEvents: Array<EditorEmittedEvent['type']> = []

      const renderResult = await render(
        <div ref={containerRef}>
          <EditorProvider
            initialConfig={{keyGenerator, schemaDefinition: defineSchema({})}}
          >
            <EditorRefPlugin ref={editorRef} />
            <PortableTextEditable />
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'focused' || event.type === 'blurred') {
                  focusEvents.push(event.type)
                }
              }}
            />
          </EditorProvider>
        </div>,
      )

      const locator = renderResult.locator.getByRole('textbox')
      await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

      const editor = editorRef.current!
      const container = containerRef.current!

      container.inert = true

      editor.send({type: 'focus'})

      // An inert element suppresses focus/blur events entirely, so there is
      // no event to await; this waits a fixed beat to observe that nothing
      // ever fires.
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(document.activeElement).not.toBe(locator.element())
      expect(focusEvents).toEqual([])

      container.inert = false

      editor.send({type: 'focus'})

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(locator.element())
      }, FOCUS_SETTLE)
    },
  )
})

describe('focus and an already-good DOM selection', () => {
  // `editor.focused` is a DOM-engine internal with no public accessor, so
  // this pins the observable contract around it instead: once the editor is
  // already the active element, a manually placed DOM selection that
  // disagrees with the model selection has to survive a `focus` send
  // untouched.
  test(
    'Scenario: focus does not rewrite an already-good DOM selection',
    {timeout: TEST_TIMEOUT},
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _type: 'block',
            _key: fooBlockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
          },
          {
            _type: 'block',
            _key: barBlockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
          },
        ],
      })

      await userEvent.click(locator.getByText('foo'))
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(locator.element()),
      )

      const barTextNode = findTextNode('bar')
      window.getSelection()?.setBaseAndExtent(barTextNode, 1, barTextNode, 2)

      editor.send({type: 'focus'})

      const domSelection = window.getSelection()
      expect(domSelection?.anchorNode).toBe(barTextNode)
      expect(domSelection?.anchorOffset).toBe(1)
      expect(domSelection?.focusOffset).toBe(2)
    },
  )
})

function findTextNode(text: string): Text {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (walker.currentNode.textContent === text) {
      return walker.currentNode as Text
    }
  }
  throw new Error(`No text node with text "${text}"`)
}

// A capture-phase `focusin` listener refocuses the trap button whenever the
// editable steals focus back. Scoped to the editable (rather than any
// non-trap target) so it never fights the test's own controls (e.g. the
// release button) for focus.
function FocusTrap({onSteal}: {onSteal?: () => void} = {}) {
  const [active, setActive] = React.useState(true)
  const trapButtonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!active) {
      return
    }

    const trapButton = trapButtonRef.current

    if (!trapButton) {
      return
    }

    const handler = (event: FocusEvent) => {
      const editable = document.querySelector('[role="textbox"]')

      if (event.target !== editable) {
        return
      }

      trapButton.focus()
      onSteal?.()
    }

    document.addEventListener('focusin', handler, true)

    return () => {
      document.removeEventListener('focusin', handler, true)
    }
  }, [active, onSteal])

  return (
    <>
      <button type="button" data-testid="trap" ref={trapButtonRef}>
        Trap
      </button>
      <button
        type="button"
        data-testid="release-trap"
        onClick={() => setActive(false)}
      >
        Release trap
      </button>
    </>
  )
}
