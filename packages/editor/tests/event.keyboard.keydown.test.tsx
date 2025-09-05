import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, execute} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getSelectionBeforeText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins'
import {getNextBlock} from '../src/selectors'

describe('event.keyboard.keydown', () => {
  test('Scenario: Executing and overwriting default event', async () => {
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
      initialValue: [
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
      ],
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
      expect(selection).not.toBeNull()
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{ArrowDown}')

    await vi.waitFor(() => {
      const selection = getSelectionBeforeText(
        editor.getSnapshot().context,
        'bar',
      )
      expect(selection).not.toBeNull()
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
