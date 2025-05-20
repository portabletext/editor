import {insert, set, setIfMissing, unset} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextSpan} from '@sanity/types'
import {createRef} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorActor} from '../src/editor/editor-machine'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'
import {InternalEditorActorRefPlugin} from '../src/plugins/plugin.internal.editor-actor-ref'

async function renderEditor(props: {
  initialValue: PortableTextBlock[] | undefined
}) {
  const keyGenerator = createTestKeyGenerator()
  const editorRef = createRef<Editor>()
  const events: Array<EditorEmittedEvent> = []
  const editorActorRef = createRef<EditorActor>()

  render(
    <EditorProvider
      initialConfig={{
        initialValue: props.initialValue,
        keyGenerator,
        schemaDefinition: defineSchema({}),
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <InternalEditorActorRefPlugin ref={editorActorRef} />
      <EventListenerPlugin
        on={(event) => {
          events.push(event)
        }}
      />
      <PortableTextEditable />
    </EditorProvider>,
  )

  await vi.waitFor(() => {
    expect(events).toEqual([
      {
        type: 'value changed',
        value: props.initialValue,
      },
      {
        type: 'ready',
      },
    ])
  })

  const pendingPatches = (
    editorActorRef.current
      ?.getSnapshot()
      .context.pendingEvents.flatMap((event) =>
        event.type === 'internal.patch' ? [event.patch] : [],
      ) ?? []
  ).map((patch) => {
    const {origin, ...rest} = patch

    return rest
  })

  return {pendingPatches}
}

describe('Feature: Self-solving', () => {
  test('Scenario: Add missing .markDefs to block', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {
            _type: 'span',
            _key: 's0',
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
      },
    ]

    const {pendingPatches} = await renderEditor({initialValue})

    expect(pendingPatches).toEqual([
      setIfMissing([], []),
      unset([{_key: 'k0'}]),
      setIfMissing([], []),
      setIfMissing([], []),
      insert(initialValue, 'before', [0]),
      setIfMissing([], []),
      set([], [{_key: 'b0'}, 'markDefs']),
    ])
  })

  test('Scenario: Add missing .marks to span', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {
            _type: 'span',
            _key: 's0',
            text: '',
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {pendingPatches} = await renderEditor({initialValue})

    expect(pendingPatches).toEqual([
      setIfMissing([], []),
      unset([{_key: 'k0'}]),
      setIfMissing([], []),
      setIfMissing([], []),
      insert(initialValue, 'before', [0]),
      setIfMissing([], []),
      set([], [{_key: 'b0'}, 'children', {_key: 's0'}, 'marks']),
    ])
  })

  test('Scenario: Add missing block _key', async () => {
    const initialValue = [
      {
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ] as unknown as Array<PortableTextBlock>

    const {pendingPatches} = await renderEditor({initialValue})

    expect(pendingPatches).toEqual([
      setIfMissing([], []),
      unset([{_key: 'k0'}]),
      setIfMissing([], []),
      setIfMissing([], []),
      insert(
        [
          {
            ...initialValue[0],
            _key: 'k2',
          },
        ],
        'before',
        [0],
      ),
    ])
  })

  test('Scenario: Add missing span _key', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {pendingPatches} = await renderEditor({initialValue})

    expect(pendingPatches).toEqual([
      setIfMissing([], []),
      unset([{_key: 'k0'}]),
      setIfMissing([], []),
      setIfMissing([], []),
      insert(
        [
          {
            ...initialValue[0],
            children: [
              {
                ...initialValue[0].children[0],
                _key: 'k2',
              },
            ],
          },
        ],
        'before',
        [0],
      ),
    ])
  })

  test('Scenario: Add missing children', async () => {
    const initialValue = [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
      },
    ]

    const {pendingPatches} = await renderEditor({initialValue})

    expect(pendingPatches).toEqual([
      setIfMissing([], []),
      unset([{_key: 'k0'}]),
      setIfMissing([], []),
      setIfMissing([], []),
      insert(
        [
          {
            ...initialValue[0],
            children: [
              {
                _key: 'k2',
                _type: 'span',
                text: '',
                marks: [],
              },
            ],
          },
        ],
        'before',
        [0],
      ),
    ])
  })
})
