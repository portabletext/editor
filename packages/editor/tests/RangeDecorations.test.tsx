import {compileSchema, isSpan, isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {page, userEvent} from '@vitest/browser/context'
import {createRef, useState, type ReactNode, type RefObject} from 'react'
import {describe, expect, it, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type MutationEvent,
  type RangeDecoration,
} from '../src'
import type {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'
import {InternalChange$Plugin} from '../src/plugins/plugin.internal.change-ref'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../src/selection/selection-point'
import {createTestEditor} from '../src/test/vitest'

const helloBlock: PortableTextBlock = {
  _key: '123',
  _type: 'block',
  markDefs: [],
  children: [{_key: '567', _type: 'span', text: 'Hello', marks: []}],
}

let rangeDecorationIteration = 0

const RangeDecorationTestComponent = ({children}: {children?: ReactNode}) => {
  rangeDecorationIteration++
  return <span data-testid="range-decoration">{children}</span>
}

describe('RangeDecorations', () => {
  it('only render range decorations as necessary', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const value = [helloBlock]
    let rangeDecorations: RangeDecoration[] = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    const {rerender} = await createTestEditor({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })

    // Re-render with the same range decorations
    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })
    // Update the range decorations, a new object with identical values
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-equal-values']).toEqual([
        1,
        'updated-with-equal-values',
      ])
    })
    // Update the range decorations with a new offset
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 4},
        },
        payload: {id: 'a'},
      },
    ]
    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        2,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new offset again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        3,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new payload
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'b'},
      },
    ]

    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([4, 'updated-with-different-payload'])
    })

    // Update the range decorations with a new payload again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'c'},
      },
    ]

    rerender({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([5, 'updated-with-different-payload'])
    })
  })

  test("Scenario: Range Decorations don't affect the caret position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef: RefObject<Editor | null> = createRef()
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function SpanRangeDecoration(props: {children?: ReactNode}) {
      return <span data-testid="range-decoration">{props.children}</span>
    }

    function App(props: {children: ReactNode}) {
      const [rangeDecorations, setRangeDecorations] = useState<
        Array<RangeDecoration>
      >([])
      const schema = compileSchema(defineSchema({}))
      const [value, setValue] = useState<Array<PortableTextBlock>>([])

      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: schema,
            initialValue: value,
          }}
        >
          <EventListenerPlugin
            on={(event) => {
              if (
                event.type === 'patch' &&
                event.patch.type === 'diffMatchPatch' &&
                event.patch.origin === 'local'
              ) {
                const blockKey = getBlockKeyFromSelectionPoint({
                  path: event.patch.path,
                  offset: 0,
                })
                const spanKey = getChildKeyFromSelectionPoint({
                  path: event.patch.path,
                  offset: 0,
                })
                const block = editorRef.current
                  ?.getSnapshot()
                  .context.value?.find((block) => block._key === blockKey)
                const child = isTextBlock({schema}, block)
                  ? block?.children?.find((child) => child._key === spanKey)
                  : undefined

                if (!isSpan({schema}, child)) {
                  return
                }

                // Create a Range Decoration that follows the span from the
                // start to the end
                const rangeDecoration: RangeDecoration = {
                  component: SpanRangeDecoration,
                  selection: {
                    anchor: {
                      path: event.patch.path.slice(0, 2),
                      offset: 0,
                    },
                    focus: {
                      path: event.patch.path.slice(0, 2),
                      offset: child.text.length,
                    },
                  },
                }

                setRangeDecorations([rangeDecoration])
              }

              if (event.type === 'mutation') {
                // Set the value to trigger a re-render of the App component
                setValue(event.value ?? [])
                mutationEvents.push(event)
              }
            }}
          />
          <PortableTextEditable rangeDecorations={rangeDecorations} />
          {props.children}
        </EditorProvider>
      )
    }

    render(
      <App>
        <EditorRefPlugin ref={editorRef} />
      </App>,
    )

    const locator = page.getByRole('textbox')

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    // Assert that the caret is after "f"
    expect(editorRef.current?.getSnapshot().context.selection).toEqual(
      getSelectionAfterText(editorRef.current!.getSnapshot().context, 'f'),
    )

    await vi.waitFor(() => {
      expect(page.getByTestId('range-decoration')).toBeInTheDocument()
    })

    // Waiting for the mutation event to be emitted so we know the value has
    // been set inside `App`
    await vi.waitFor(() => {
      expect(mutationEvents.length).toEqual(1)
    })

    // Assert that the caret is still after "f"
    expect(editorRef.current?.getSnapshot().context.selection).toEqual(
      getSelectionAfterText(editorRef.current!.getSnapshot().context, 'f'),
    )
  })
})
