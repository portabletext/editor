import {defineSchema} from '@portabletext/schema'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, raise} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins'
import {getFocusSpan, getFocusTextBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert.child', () => {
  test('Scenario: Carrying over an annotation', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot}) => {
                const focusTextBlock = getFocusTextBlock(snapshot)
                const focusSpan = getFocusSpan(snapshot)

                if (!focusTextBlock || !focusSpan) {
                  return false
                }

                const suggestionKey =
                  focusSpan.node.marks?.at(0) ?? snapshot.context.keyGenerator()

                return {focusSpan, focusTextBlock, suggestionKey}
              },
              actions: [
                ({event}, {focusSpan, focusTextBlock, suggestionKey}) => [
                  ...((focusSpan.node.marks ?? []).length === 0
                    ? [
                        raise({
                          type: 'block.set',
                          at: focusTextBlock.path,
                          props: {
                            markDefs: [
                              ...(focusTextBlock.node.markDefs ?? []),
                              {
                                _type: 'suggestion',
                                _key: suggestionKey,
                              },
                            ],
                          },
                        }),
                        raise({
                          type: 'insert.child',
                          child: {
                            _type: 'span',
                            text: event.text,
                            marks: [suggestionKey],
                          },
                        }),
                      ]
                    : [
                        raise({
                          type: 'insert.child',
                          child: {
                            _type: 'span',
                            text: event.text,
                            marks: [suggestionKey],
                          },
                        }),
                      ]),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        annotations: [{name: 'suggestion'}],
      }),
    })

    await userEvent.click(locator)

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k3', text: 'a', marks: ['k2']}],
          markDefs: [{_type: 'suggestion', _key: 'k2'}],
          style: 'normal',
        },
      ])
    })

    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k3', text: 'ab', marks: ['k2']}],
          markDefs: [{_type: 'suggestion', _key: 'k2'}],
          style: 'normal',
        },
      ])
    })
  })
})
