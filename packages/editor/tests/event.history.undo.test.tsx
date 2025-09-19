import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, execute, forward, raise} from '../src/behaviors'
import type {MutationEvent} from '../src/editor/relay-machine'
import {BehaviorPlugin, EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.history.undo', () => {
  test('Scenario: Undoing writing two words', async () => {
    const mutationEvents: Array<MutationEvent> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')
    await userEvent.type(locator, ' bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })
  })

  test('Scenario: Selection change does not affect the undo stack', async () => {
    const {editor, locator} = await createTestEditor()

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')
    await userEvent.keyboard('{ArrowLeft}')
    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['fobaro'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Undoing action sets', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'x',
              actions: [
                // The 'x' is inserted in its own undo step
                ({event}) => [execute(event)],
                // And then deleted again and replaced with 'y*' in another undo step
                () => [
                  execute({type: 'delete.backward', unit: 'character'}),
                  execute({type: 'insert.text', text: 'y'}),
                  execute({type: 'insert.text', text: '*'}),
                ],
                // And finally 'z' gets its own undo step as well
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y*z'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y*'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['x'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Undoing raised action sets', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'x',
              actions: [
                // This gets its own undo step
                () => [execute({type: 'insert.text', text: 'y'})],
                // And this also gets its own undo step
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // Since this Behavior doesn't do any `execute` actions,
                // it will not squash the undo stack
                () => [raise({type: 'insert.text', text: 'x'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['yz'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y'])
    })
  })

  test('Scenario: Undoing recursive raises', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              actions: [() => [raise({type: 'insert.text', text: 'B'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [
                  raise({type: 'insert.text', text: 'b'}),
                  raise({type: 'insert.break'}),
                  raise({type: 'insert.text', text: 'c'}),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['B', 'c'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: A lonely `forward` action does not squash the recursive undo stack', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [({event}) => [forward(event)]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // 'A' is inserted in its own undo step
                () => [execute({type: 'insert.text', text: 'A'})],
                // 'B' is inserted in its own undo step
                () => [execute({type: 'insert.text', text: 'B'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['AB'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['A'])
    })
  })

  describe('Scenario Outline: Custom events', () => {
    test('Scenario: execute', async () => {
      const {editor} = await createTestEditor({
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior<{text: string}>({
                on: 'custom.insert block',
                actions: [
                  ({event}) => [
                    execute({
                      type: 'insert.block',
                      block: {
                        _type: 'block',
                        children: [
                          {
                            _type: 'span',
                            text: event.text,
                          },
                        ],
                      },
                      placement: 'auto',
                      select: 'end',
                    }),
                  ],
                ],
              }),
            ]}
          />
        ),
      })

      editor.send({type: 'custom.insert block', text: 'foo'})
      editor.send({type: 'custom.insert block', text: 'bar'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
      })
    })

    test('Scenario: forward', async () => {
      const {editor} = await createTestEditor({
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior<{text: string}>({
                on: 'custom.insert block',
                actions: [
                  ({event}) => [
                    forward({
                      type: 'insert.block',
                      block: {
                        _type: 'block',
                        children: [
                          {
                            _type: 'span',
                            text: event.text,
                          },
                        ],
                      },
                      placement: 'auto',
                      select: 'end',
                    }),
                  ],
                ],
              }),
            ]}
          />
        ),
      })

      editor.send({type: 'custom.insert block', text: 'foo'})
      editor.send({type: 'custom.insert block', text: 'bar'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
      })
    })

    test('Scenario: raise', async () => {
      const {editor} = await createTestEditor({
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior<{text: string}>({
                on: 'custom.insert block',
                actions: [
                  ({event}) => [
                    raise({
                      type: 'insert.block',
                      block: {
                        _type: 'block',
                        children: [
                          {
                            _type: 'span',
                            text: event.text,
                          },
                        ],
                      },
                      placement: 'auto',
                      select: 'end',
                    }),
                  ],
                ],
              }),
            ]}
          />
        ),
      })

      editor.send({type: 'custom.insert block', text: 'foo'})
      editor.send({type: 'custom.insert block', text: 'bar'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
      })
    })
  })

  test('Scenario: `forward` in one step, `raise` in another', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({event}) => [forward(event)],
                () => [
                  raise({type: 'delete.backward', unit: 'character'}),
                  raise({type: 'insert.text', text: 'b'}),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['b'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })

  test('Scenario: `forward` twice in same step', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [({event}) => [forward(event), forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['aa'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: `forward` twice in separate steps', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({event}) => [forward(event)],
                ({event}) => [forward(event)],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['aa'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })

  test('Scenario: two `forward`s in separate steps does not squash the undo stack', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({event}) => [forward(event)],
                ({event}) => [forward(event)],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // 'A' is inserted in its own undo step
                () => [raise({type: 'insert.text', text: 'A'})],
                // 'B' is inserted in its own undo step
                () => [raise({type: 'insert.text', text: 'B'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['ABAB'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['ABA'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['AB'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['A'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })
})
