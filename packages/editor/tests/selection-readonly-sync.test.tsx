import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {EditorEmittedEvent} from '../src/editor/relay'
import type {Editor} from '../src/engine/interfaces/editor'
import {useEngineStatic} from '../src/engine/react/hooks/use-engine-static'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import type {EditorSelection} from '../src/types/editor'

/**
 * Selection must keep syncing in read-only editors. The `selectionchange`
 * handler used to bail unless the editable was the document's active
 * element, and a read-only editable (`contenteditable="false"`, no tab stop)
 * can never be the active element, so the model selection froze: stale
 * selections stuck around and new selections never reached consumers
 * (selection-derived UI, `serialize` on copy). The editor machine already
 * whitelists `select` in read-only mode; the DOM side has to deliver it.
 */

const initialValue = [
  {
    _type: 'block',
    _key: 'blockA',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'spanA', text: 'first', marks: []}],
  },
  {
    _type: 'block',
    _key: 'blockB',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'spanB', text: 'second', marks: []}],
  },
]

describe('Feature: Read-Only Selection Sync', () => {
  test('Scenario: Selecting text in a read-only editor syncs the model selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    selectDomText('first', 1, 'second', 3)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
          offset: 1,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: A selection made before turning read-only keeps following the DOM', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 6,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(6)
    })

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    // The user moves the selection while read-only; the model must not stay
    // stuck on the pre-read-only range.
    selectDomText('second', 0, 'second', 2)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'blockB'}, 'children', {_key: 'spanB'}],
          offset: 2,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Moving the DOM selection out of a read-only editor deselects through a `select` event', async () => {
    const selectEvents: Array<{type: 'select'; at: EditorSelection}> = []
    let engine: Editor | undefined
    const emittedEvents: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <>
          <EngineProbe
            onEngine={(editorEngine) => {
              engine = editorEngine
            }}
          />
          <EventListenerPlugin
            on={(event) => {
              emittedEvents.push(event)
            }}
          />
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'select',
                actions: [
                  ({event}) => [forward(event)],
                  ({event}) => [
                    effect(() => {
                      selectEvents.push(event)
                    }),
                  ],
                ],
              }),
            ]}
          />
        </>
      ),
    })

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    selectDomText('first', 1, 'first', 3)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toEqual(null)
    })

    const outside = document.createElement('p')
    outside.textContent = 'outside'
    document.body.appendChild(outside)
    selectDomText('outside', 0, 'outside', 7)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(null)
    })
    const firstSelection = {
      anchor: {
        path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}],
        offset: 1,
      },
      focus: {path: [{_key: 'blockA'}, 'children', {_key: 'spanA'}], offset: 3},
      backward: false,
    }
    expect(selectEvents).toEqual([
      {type: 'select', at: firstSelection},
      {type: 'select', at: null},
    ])
    expect(emittedEvents).toEqual([
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k0'}]},
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: initialValue[0],
        },
        origin: 'remote',
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [1],
          position: 'before',
          node: initialValue[1],
        },
        origin: 'remote',
      },
      {type: 'value changed', value: initialValue},
      {type: 'ready'},
      {type: 'read only'},
      {type: 'selection', selection: firstSelection},
      {type: 'selection', selection: null},
    ])
    expect(engine?.focused).toEqual(false)

    outside.remove()
  })
})

function selectDomText(
  anchorText: string,
  anchorOffset: number,
  focusText: string,
  focusOffset: number,
) {
  const anchorNode = findTextNode(anchorText)
  const focusNode = findTextNode(focusText)
  window
    .getSelection()
    ?.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
}

function findTextNode(text: string): Text {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (walker.currentNode.textContent === text) {
      return walker.currentNode as Text
    }
  }
  throw new Error(`No text node with text "${text}"`)
}

function EngineProbe({onEngine}: {onEngine: (engine: Editor) => void}) {
  onEngine(useEngineStatic())
  return null
}
