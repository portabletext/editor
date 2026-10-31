import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import type {BehaviorEvent} from '../src/behaviors'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

vi.mock('../src/engine/dom/utils/environment', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../src/engine/dom/utils/environment')
  >()),
  HAS_BEFORE_INPUT_SUPPORT: false,
}))

describe('keydown delete without beforeinput support', () => {
  test('Scenario: Backspace deletes the character before the caret', async () => {
    const {editor, behaviorEvents} = await createEditorWithSelection({
      anchorOffset: 7,
      focusOffset: 7,
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo ba| baz qux',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'keyboard.keydown',
          originEvent: {
            key: 'Backspace',
            code: 'Backspace',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
        {type: 'delete.backward', unit: 'character'},
        {type: 'delete', direction: 'backward', unit: 'character'},
        {
          type: 'keyboard.keyup',
          originEvent: {
            key: 'Backspace',
            code: 'Backspace',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
      ])
    })
  })

  test('Scenario: Backspace deletes an expanded selection backward', async () => {
    const {editor, behaviorEvents} = await createEditorWithSelection({
      anchorOffset: 4,
      focusOffset: 7,
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo | baz qux',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'keyboard.keydown',
          originEvent: {
            key: 'Backspace',
            code: 'Backspace',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
        {type: 'delete', direction: 'backward'},
        {
          type: 'keyboard.keyup',
          originEvent: {
            key: 'Backspace',
            code: 'Backspace',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
      ])
    })
  })

  test('Scenario: Delete deletes the character after the caret', async () => {
    const {editor, behaviorEvents} = await createEditorWithSelection({
      anchorOffset: 7,
      focusOffset: 7,
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar|baz qux',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'keyboard.keydown',
          originEvent: {
            key: 'Delete',
            code: 'Delete',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
        {type: 'delete.forward', unit: 'character'},
        {type: 'delete', direction: 'forward', unit: 'character'},
        {
          type: 'keyboard.keyup',
          originEvent: {
            key: 'Delete',
            code: 'Delete',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
      ])
    })
  })

  test('Scenario: Delete deletes an expanded selection forward', async () => {
    const {editor, behaviorEvents} = await createEditorWithSelection({
      anchorOffset: 4,
      focusOffset: 7,
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo | baz qux',
      )
      expect(behaviorEvents).toEqual([
        {
          type: 'keyboard.keydown',
          originEvent: {
            key: 'Delete',
            code: 'Delete',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
        {type: 'delete', direction: 'forward'},
        {
          type: 'keyboard.keyup',
          originEvent: {
            key: 'Delete',
            code: 'Delete',
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
          },
        },
      ])
    })
  })
})

async function createEditorWithSelection({
  anchorOffset,
  focusOffset,
}: {
  anchorOffset: number
  focusOffset: number
}) {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const behaviorEvents: Array<BehaviorEvent> = []

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'foo bar baz qux', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: '*',
            actions: [
              ({event}) => [
                effect(() => {
                  behaviorEvents.push(event)
                }),
                forward(event),
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
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: anchorOffset,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: focusOffset,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: anchorOffset,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: focusOffset,
      },
      backward: false,
    })
  })

  behaviorEvents.length = 0

  return {editor, behaviorEvents}
}
