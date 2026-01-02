import {getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {execute, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {getSelectionBeforeText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {getNextBlock} from '../src/selectors/selector.get-next-block'
import {createTestEditor} from '../src/test/vitest'

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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'newbar',
        'baz',
      ])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'newbar',
        'baz',
      ])
    })
  })
})
