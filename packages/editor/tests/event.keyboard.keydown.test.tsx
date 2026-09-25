import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {effect, execute, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {getNextBlock} from '../src/selectors/selector.get-next-block'
import {createTestEditor} from '../src/test/vitest'
import type {EditorSelection} from '../src/types/editor'
import {getSelectionBeforeText} from '../test-utils/text-selection'

describe('event.keyboard.keydown', () => {
  const initialValue = [
    {
      _type: 'block',
      _key: 'k0',
      children: [
        {
          _type: 'span',
          _key: 'k1',
          text: 'foo',
        },
      ],
    },
    {
      _type: 'block',
      _key: 'k2',
      children: [
        {
          _type: 'span',
          _key: 'k3',
          text: 'bar',
        },
      ],
    },
    {
      _type: 'block',
      _key: 'k4',
      children: [
        {
          _type: 'span',
          _key: 'k5',
          text: 'baz',
        },
      ],
    },
  ]

  test('Scenario: `execute` overwrites the native event', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({snapshot, event}) => {
                if (event.originEvent.key !== 'ArrowDown') {
                  return false
                }

                const nextBlock = getNextBlock(snapshot)

                if (nextBlock) {
                  return {nextBlock}
                }

                return false
              },
              actions: [
                (_, {nextBlock}) => [
                  execute({
                    type: 'select',
                    at: {
                      anchor: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                      focus: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      initialValue,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'foo',
      )

      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{ArrowDown}')

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'bar',
      )

      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: new|bar', 'B: baz'].join('\n'),
      )
    })
  })

  test('Scenario: `raise` overwrites the native event', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({snapshot, event}) => {
                if (event.originEvent.key !== 'ArrowDown') {
                  return false
                }

                const nextBlock = getNextBlock(snapshot)

                if (nextBlock) {
                  return {nextBlock}
                }

                return false
              },
              actions: [
                (_, {nextBlock}) => [
                  raise({
                    type: 'select',
                    at: {
                      anchor: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                      focus: {
                        path: nextBlock.path,
                        offset: 0,
                      },
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      initialValue,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'foo',
      )

      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{ArrowDown}')

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'bar',
      )

      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: new|bar', 'B: baz'].join('\n'),
      )
    })
  })

  test('Scenario: The snapshot sees a caret move made right before the key press', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const selections: Array<EditorSelection> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo bar'}],
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({event}) => event.originEvent.key === 'x',
              actions: [
                ({snapshot}) => [
                  effect(() => {
                    selections.push(snapshot.context.selection)
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    const textNode = findTextNode(locator.element(), 'foo bar')

    window.getSelection()?.setBaseAndExtent(textNode, 3, textNode, 3)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      })
    })

    // Frozen timers keep the engine's `selectionchange` sync pending, so the
    // move to offset 7 is unsynced when the key lands on any runner speed.
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    try {
      const selectionChanged = new Promise((resolve) => {
        document.addEventListener('selectionchange', resolve, {once: true})
      })
      window.getSelection()?.setBaseAndExtent(textNode, 7, textNode, 7)
      await selectionChanged

      await userEvent.keyboard('x')
    } finally {
      vi.useRealTimers()
    }

    await vi.waitFor(() => {
      expect(selections).toEqual([
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
          backward: false,
        },
      ])
    })
  })
})

function findTextNode(root: Node, text: string): Text {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (
      walker.currentNode instanceof Text &&
      walker.currentNode.textContent === text
    ) {
      return walker.currentNode
    }
  }
  throw new Error(`No text node with text "${text}"`)
}
