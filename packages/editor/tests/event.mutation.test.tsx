import {insert, setIfMissing} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {createRef, useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent, type Locator} from 'vitest/browser'
import {
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
  type MutationEvent,
  type Patch,
} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.mutation', () => {
  test('Scenario: a mutation batched before a read-only flip survives a host that rejects mutations while read-only', async () => {
    let readOnly = false
    const mutations: Array<MutationEvent> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type !== 'mutation') {
              return
            }

            if (readOnly) {
              // Mirrors Studio's and Canvas' `onChange`: both throw when
              // asked to patch a read-only document.
              throw new Error('Attempted to patch a read-only document')
            }

            mutations.push(event)
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')

    readOnly = true
    editor.send({type: 'update readOnly', readOnly: true})

    // The batcher's typing debounce (250ms) and flush interval (500ms in
    // test mode) both fire well within this window: waiting past it, still
    // read-only, proves the held mutation survives an attempted flush
    // rather than merely a flip that outran the cadence.
    await new Promise((resolve) => setTimeout(resolve, 600))

    readOnly = false
    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        typedFooPatches(),
      ])
    })
  })

  test('Scenario: an edit batched before a read-only flip still blocks snapshot clobbering until delivered', async () => {
    const mutations: Array<MutationEvent> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')

    editor.send({type: 'update readOnly', readOnly: true})

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // The batcher's typing debounce (250ms) and flush interval (500ms in
    // test mode) both fire well within this window: waiting past it, the
    // typed text is still the editor's local value, proving the busy guard
    // parked the incoming remote value instead of letting it clobber the
    // unflushed edit.
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    expect(mutations).toEqual([])

    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(mutations.map((mutation) => mutation.patches)).toEqual([
        typedFooPatches(),
      ])
    })

    // Only once the edit is delivered does the sync machine leave `busy`
    // and reconcile the parked remote value.
    await vi.waitFor(
      () => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      },
      // The sync machine parks in `busy` and re-checks on a 1s timer, so
      // this can land a beat over a second after the edit is delivered.
      {timeout: 5000},
    )
  })

  test('Scenario: pending mutations are handed over on unmount even while read-only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = createRef<Editor>()
    const mutations: Array<MutationEvent> = []

    const renderResult = await render(
      <EditorProvider
        initialConfig={{keyGenerator, schemaDefinition: defineSchema({})}}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    editorRef.current!.send({type: 'update readOnly', readOnly: true})

    renderResult.unmount()

    expect(mutations.map((mutation) => mutation.patches)).toEqual([
      typedFooPatches(),
    ])
  })

  test('Scenario: mutations flush once the editor becomes editable again, even for edits made while still read-only', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    let resolveFooMutation: () => void
    const fooMutationPromise = new Promise<void>((resolve) => {
      resolveFooMutation = resolve
    })

    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            onEvent(event)
            if (
              event.type === 'mutation' &&
              toTextspec({
                schema: compileSchema(defineSchema({})),
                value: event.value ?? [],
                selection: null,
              }) === 'B: foo'
            ) {
              resolveFooMutation()
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')

    await fooMutationPromise

    editor.send({type: 'insert.text', text: 'bar'})

    editor.send({type: 'update readOnly', readOnly: true})

    const foobarMutation = expect.objectContaining({
      type: 'mutation',
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // The batcher's typing debounce (250ms) and flush interval (500ms in
    // test mode) both fire well within this window: waiting past it, still
    // read-only, proves the "bar" mutation is held, not just late.
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(onEvent).not.toHaveBeenCalledWith(foobarMutation)

    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(foobarMutation)
    })
  })

  test('Scenario: Batching typing mutations', async () => {
    const mutations: Array<MutationEvent> = []

    const {locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    // Dispatched synchronously, back-to-back, one `insert.text` op per
    // dispatched event: the burst can't straddle the batcher's flush
    // cadence because nothing yields the event loop between the ops.
    insertTextSync(locator, 'foo')
    await vi.waitFor(() => expect(mutations).toHaveLength(1))
    insertTextSync(locator, 'bar')
    await vi.waitFor(() => expect(mutations).toHaveLength(2))

    expect(mutations[0]!.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(mutations[1]!.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Flushing pending mutations when unmounting', async () => {
    const keyGenerator = createTestKeyGenerator()
    // Keeping track of the patches emitted by the editor
    const patches: Array<Patch> = []
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function App() {
      // Editor key is used to trigger a re-render of the editor
      const [editorKey, setEditorKey] = useState('editor-0')

      return (
        <EditorProvider
          key={editorKey}
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
          }}
        >
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)

                if (
                  event.patch.type === 'diffMatchPatch' &&
                  event.patch.value ===
                    stringifyPatches(makePatches(makeDiff('foo', 'foob')))
                ) {
                  // When the patch for "b" is received, we know that there is
                  // a pending mutation. Let's trigger a re-render of the
                  // editor before the mutation event is naturally emitted.
                  setEditorKey('editor-1')
                }
              }

              if (event.type === 'mutation') {
                mutationEvents.push(event)
              }
            }}
          />
          <PortableTextEditable />
        </EditorProvider>
      )
    }

    await render(<App />)

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      // Skip the two initial patches that set the editor up
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'f'))),
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('f', 'fo'))),
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('fo', 'foo'))),
        },
      ])

      expect(mutationEvents).toHaveLength(1)
    })

    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(patches.slice(5)).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foob'))),
        },
      ])

      expect(mutationEvents.at(1)).toEqual({
        type: 'mutation',
        patches: [
          {
            origin: 'local',
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: stringifyPatches(makePatches(makeDiff('foo', 'foob'))),
          },
        ],
        value: [
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foob',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      expect(mutationEvents.length).toBe(2)
    })
  })
})

function typedFooPatches(): Array<Patch> {
  return [
    {...setIfMissing([], []), origin: 'local'},
    {
      ...insert(
        [
          {
            _key: 'k0',
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        'before',
        [0],
      ),
      origin: 'local',
    },
    {
      origin: 'local',
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('', 'f'))),
    },
    {
      origin: 'local',
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('f', 'fo'))),
    },
    {
      origin: 'local',
      type: 'diffMatchPatch',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      value: stringifyPatches(makePatches(makeDiff('fo', 'foo'))),
    },
  ]
}

function insertTextSync(locator: Locator, text: string) {
  const element = locator.element()
  for (const character of text) {
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: character,
        bubbles: true,
        cancelable: true,
      }),
    )
    // A real keystroke's native default action fires `input` synchronously;
    // a script-dispatched `beforeinput` is untrusted and the browser skips
    // that default action, so the editable's deferred native-path insert
    // (gated on `insertText` with a collapsed selection, a single `[a-z ]`
    // character, and a nonzero anchor offset, see the `native` fast path
    // in `editable.tsx`) never flushes without this.
    element.dispatchEvent(new InputEvent('input', {bubbles: true}))
  }
}
