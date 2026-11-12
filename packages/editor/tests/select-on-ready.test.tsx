import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React, {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {useEditor, type EditorSelection} from '../src'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {defineContainer} from '../src/renderers/renderer.types'

function InitialSelectionPlugin(props: {selection: EditorSelection}) {
  const editor = useEditor()

  useEffect(() => {
    const subscription = editor.on('ready', () => {
      editor.send({type: 'select', at: props.selection})
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.selection])

  return null
}

describe('select on ready', () => {
  describe.each([
    {strict: false, mode: 'without React.StrictMode'},
    {strict: true, mode: 'with React.StrictMode'},
  ])('$mode', ({strict}) => {
    test('Scenario: selecting a range inside one root block on ready', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const selection = range([blockKey, 'children', spanKey], 1, 2)
      const {editor, events} = await renderEditor({
        strict,
        keyGenerator,
        value: [block(blockKey, spanKey, 'barbaz')],
        selection,
      })

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(selection),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([{type: 'ready'}, {type: 'selection', selection}])
    })

    test('Scenario: selecting a range inside a block in a callout on ready', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const selection = range(
        [calloutKey, 'content', blockKey, 'children', spanKey],
        1,
        2,
      )
      const {editor, events} = await renderEditor({
        strict,
        keyGenerator,
        container: true,
        value: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [block(blockKey, spanKey, 'barbaz')],
          },
        ],
        selection,
      })

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(selection),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([{type: 'ready'}, {type: 'selection', selection}])
    })

    test('Scenario: selecting a range across two root blocks on ready', async () => {
      const keyGenerator = createTestKeyGenerator()
      const firstBlockKey = keyGenerator()
      const firstSpanKey = keyGenerator()
      const secondBlockKey = keyGenerator()
      const secondSpanKey = keyGenerator()
      const selection = {
        anchor: {
          path: [{_key: firstBlockKey}, 'children', {_key: firstSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: secondBlockKey}, 'children', {_key: secondSpanKey}],
          offset: 2,
        },
        backward: false,
      } as EditorSelection
      const {editor, events} = await renderEditor({
        strict,
        keyGenerator,
        value: [
          block(firstBlockKey, firstSpanKey, 'foo'),
          block(secondBlockKey, secondSpanKey, 'barbaz'),
        ],
        selection,
      })

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(selection),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([{type: 'ready'}, {type: 'selection', selection}])
    })

    test('Scenario: sending select after ready moves the selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const first = range([blockKey, 'children', spanKey], 1, 2)
      const later = range([blockKey, 'children', spanKey], 3, 5)
      const {editor, events} = await renderEditor({
        strict,
        keyGenerator,
        value: [block(blockKey, spanKey, 'barbaz')],
        selection: first,
      })

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(first),
      )

      editor.send({type: 'select', at: later})

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(later),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([
        {type: 'ready'},
        {type: 'selection', selection: first},
        {type: 'selection', selection: later},
      ])
    })

    test('Scenario: a plugin mounted after ready selects nothing', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const lateSelection = range([blockKey, 'children', spanKey], 1, 2)
      const direct = range([blockKey, 'children', spanKey], 3, 5)
      const {editor, events, rerender} = await renderEditor({
        strict,
        keyGenerator,
        value: [block(blockKey, spanKey, 'barbaz')],
      })

      await rerender({selection: lateSelection})
      editor.send({type: 'select', at: direct})

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(direct),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([{type: 'ready'}, {type: 'selection', selection: direct}])
    })

    test('Scenario: changing the plugin selection after ready does not change the selection, while sending select does', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const first = range([blockKey, 'children', spanKey], 1, 2)
      const changed = range([blockKey, 'children', spanKey], 2, 4)
      const direct = range([blockKey, 'children', spanKey], 3, 5)
      const {editor, events, rerender} = await renderEditor({
        strict,
        keyGenerator,
        value: [block(blockKey, spanKey, 'barbaz')],
        selection: first,
      })

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(first),
      )

      await rerender({selection: changed})
      editor.send({type: 'select', at: direct})

      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.selection).toEqual(direct),
      )
      expect(
        events.filter(
          (event) => event.type === 'ready' || event.type === 'selection',
        ),
      ).toEqual([
        {type: 'ready'},
        {type: 'selection', selection: first},
        {type: 'selection', selection: direct},
      ])
    })
  })
})

// StrictMode has to wrap the whole tree, which `createTestEditor` does not do.
async function renderEditor(options: {
  strict: boolean
  keyGenerator: () => string
  value: Array<PortableTextBlock>
  selection?: EditorSelection
  container?: boolean
}) {
  const events: Array<EditorEmittedEvent> = []
  const editorRef = React.createRef<Editor>()
  const callout = defineContainer({type: 'callout', arrayField: 'content'})

  function tree(selection: EditorSelection | undefined) {
    const element = (
      <EditorProvider
        initialConfig={{
          keyGenerator: options.keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {
                name: 'callout',
                fields: [
                  {name: 'content', type: 'array', of: [{type: 'block'}]},
                ],
              },
            ],
          }),
          initialValue: options.value,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        {options.container ? <NodePlugin nodes={[callout]} /> : null}
        <EventListenerPlugin on={(event) => events.push(event)} />
        {selection ? <InitialSelectionPlugin selection={selection} /> : null}
        <PortableTextEditable />
      </EditorProvider>
    )

    return options.strict ? (
      <React.StrictMode>{element}</React.StrictMode>
    ) : (
      element
    )
  }

  const result = await render(tree(options.selection))
  await expect
    .element(result.locator.getByRole('textbox'), {timeout: 5_000})
    .toBeInTheDocument()
  await vi.waitFor(() =>
    expect(events.some((event) => event.type === 'ready')).toBe(true),
  )

  return {
    editor: editorRef.current!,
    events,
    rerender: async (next: {selection: EditorSelection}) =>
      await result.rerender(tree(next.selection)),
  }
}

function range(
  path: Array<string>,
  anchorOffset: number,
  focusOffset: number,
): EditorSelection {
  const keyedPath = path.map((segment) =>
    segment === 'content' || segment === 'children' ? segment : {_key: segment},
  )

  return {
    anchor: {path: keyedPath, offset: anchorOffset},
    focus: {path: keyedPath, offset: focusOffset},
    backward: false,
  } as EditorSelection
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _key: blockKey,
    _type: 'block',
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}
