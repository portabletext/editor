import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('type after inline object', () => {
  test('Typing after ArrowRight past inline object inserted by behavior', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [
                  raise({
                    type: 'delete',
                    at: {
                      anchor: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                        offset: 0,
                      },
                      focus: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                        offset: 1,
                      },
                    },
                  }),
                  raise({
                    type: 'insert.child',
                    child: {
                      _key: 'k2',
                      _type: 'stock-ticker',
                    },
                  }),
                  raise({
                    type: 'select',
                    at: {
                      anchor: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
                        offset: 0,
                      },
                      focus: {
                        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
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
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Type "a" which triggers the behavior to replace with stock-ticker
    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{stock-ticker},',
      ])
    })

    // ArrowRight past the inline object
    await userEvent.keyboard('{ArrowRight}')

    // Wait for the selection to move past the inline object
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const childSegment = selection?.focus.path.at(2)

      expect(childSegment).toEqual({_key: 'k3'})
    })

    // Type "new"
    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{stock-ticker},new',
      ])
    })
  })
})
