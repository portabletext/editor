import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {execute, forward, raise} from '../behaviors/behavior.types.action'
import {defineBehavior} from '../behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../plugins/plugin.behavior'
import {getFirstBlock, getFocusBlock} from '../selectors'
import {createTestEditor} from '../test/vitest'
import type {EditorSelection} from '../types/editor'

describe('event.history.undo', () => {
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

  test('Scenario: Undoing one-action action sets', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [raise({type: 'insert.text', text: 'b'})],
                () => [raise({type: 'insert.text', text: 'c'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bc'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['b'])
    })
  })

  test('Scenario: Undoing `insert.text` after `delete`', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot, event}) => {
                if (event.text !== 'c') {
                  return false
                }

                const focusBlock = getFocusBlock(snapshot)

                if (!focusBlock) {
                  return false
                }

                return {focusBlock}
              },
              actions: [
                ({event}) => [forward(event)],
                (_, {focusBlock}) => [
                  raise({
                    type: 'delete',
                    at: {
                      anchor: {
                        path: focusBlock.path,
                        offset: 0,
                      },
                      focus: {
                        path: focusBlock.path,
                        offset: 3,
                      },
                    },
                  }),
                ],
                () => [raise({type: 'insert.text', text: 'd'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await userEvent.type(locator, 'b')
    await userEvent.type(locator, 'c')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['d'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['abc'])
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

  test('Scenario: Undo after moving cursor after ended Behavior', async () => {
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

    await userEvent.keyboard('{ControlOrMeta>}{z}{/ControlOrMeta}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })

    await userEvent.keyboard('{ArrowLeft}')

    await userEvent.keyboard('{ControlOrMeta>}{z}{/ControlOrMeta}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Undo after sending `select` after ended Behavior', async () => {
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
            defineBehavior<{
              at: EditorSelection
            }>({
              on: 'custom.select',
              actions: [({event}) => [raise({type: 'select', at: event.at})]],
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

    const firstBlock = getFirstBlock(editor.getSnapshot())

    if (!firstBlock) {
      throw new Error('First block not found')
    }

    // Provoke the creation of a new undo step
    editor.send({
      type: 'custom.select',
      at: {
        anchor: {path: firstBlock.path, offset: 0},
        focus: {path: firstBlock.path, offset: 0},
      },
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })
})
