import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  EditorProvider,
  PortableTextEditable,
  type EditorEmittedEvent,
  type MutationEvent,
  type Patch,
} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.mutation', () => {
  test('Scenario: Deferring mutation events when read-only', async () => {
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
              getTersePt({
                schema: compileSchema(defineSchema({})),
                value: event.value ?? [],
              }).at(0) === 'foo'
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

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
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
      }),
    )

    editor.send({type: 'update readOnly', readOnly: false})

    await new Promise((resolve) => setTimeout(resolve, 250))

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mutation',
          value: [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        }),
      )
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

    await userEvent.type(locator, 'foo')
    await new Promise((resolve) => setTimeout(resolve, 250))
    await userEvent.type(locator, 'bar')
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(mutations).toHaveLength(2)
    expect(mutations[0].value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(mutations[1].value).toEqual([
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
      // Ignoring the two initial patches as they merely set the editor up
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
