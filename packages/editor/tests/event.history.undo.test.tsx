import {applyAll, diffMatchPatch, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  effect,
  execute,
  forward,
  raise,
} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {getFirstBlock, getFocusBlock} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'
import type {EditorSelection} from '../src/types/editor'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

const nestedSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [
                            {type: 'block'},
                            {
                              type: 'object',
                              name: 'callout',
                              fields: [
                                {
                                  name: 'content',
                                  type: 'array',
                                  of: [{type: 'block'}],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({children}) => <>{children}</>,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({children}) => <>{children}</>,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
          render: ({children}) => <>{children}</>,
        }),
      ],
    }),
  ],
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({children}) => <>{children}</>,
})

const childrenFieldSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'gallery',
      fields: [
        {name: 'title', type: 'string'},
        {
          name: 'children',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'item',
              fields: [{name: 'label', type: 'string'}],
            },
          ],
        },
      ],
    },
  ],
})

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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: y*z|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: y*|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: x|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: bc|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: b|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: d|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: abc|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: yz|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: y|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: B', 'B: c|'].join('\n'),
      )
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: AB|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: A|')
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

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')

      editor.send({type: 'history.undo'})

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
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

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')

      editor.send({type: 'history.undo'})

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
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

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')

      editor.send({type: 'history.undo'})

      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })
  })

  test('Scenario: An empty `remove.text` starting an action set keeps its undo boundary', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({styles: [{name: 'h1'}, {name: 'h2'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.set h1',
              actions: [
                () => [
                  execute({
                    type: 'block.set',
                    at: [{_key: blockKey}],
                    props: {style: 'h1'},
                  }),
                ],
              ],
            }),
            defineBehavior({
              on: 'custom.set h2',
              actions: [
                () => [
                  execute({
                    type: 'remove.text',
                    at: [{_key: blockKey}, 'children', {_key: spanKey}],
                    offset: 0,
                    text: '',
                  }),
                  execute({
                    type: 'block.set',
                    at: [{_key: blockKey}],
                    props: {style: 'h2'},
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    editor.send({type: 'custom.set h1'})
    editor.send({type: 'custom.set h2'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'h2',
      },
    ])

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'h1',
      },
    ])
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: b|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: a|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: aa|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: aa|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: a|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: ABAB|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: ABA|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: AB|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: A|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: b|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: a|')

    await userEvent.keyboard('{ArrowLeft}')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Scenario: Forwarding `insert.text` preserves undo batching', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot}) => {
                const focusBlock = getFocusBlock(snapshot)

                if (!focusBlock) {
                  return false
                }

                return {focusBlock}
              },
              actions: [({event}) => [forward(event)], () => []],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'hello')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Scenario: Forwarding `insert.text` with side effect preserves undo batching', async () => {
    const sideEffectLog: Array<string> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot}) => {
                const focusBlock = getFocusBlock(snapshot)

                if (!focusBlock) {
                  return false
                }

                return {focusBlock}
              },
              actions: [
                ({event}) => [forward(event)],
                () => [
                  effect(() => {
                    sideEffectLog.push('observed')
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'hello')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|')
      expect(sideEffectLog).toHaveLength(5)
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Scenario: Forwarding `insert.text` with `raise` preserves undo batching', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event, snapshot}) => {
                if (event.text === '!') {
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
                () => [raise({type: 'insert.text', text: '!'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'hi')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: h!i!|')
    })

    // First undo reverts the second raise ('!' after 'i')
    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: h!i|')

    // Second undo reverts the forwarded 'i' and the first raise ('!' after 'h')
    // These merge because the raise's insert.text is adjacent to the forward's
    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: h|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: b|')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: a|')
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })
  })

  test('Scenario: Undoing decorator add across a range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    // Select "oob" (offset 1 to 4)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    editor.send({
      type: 'decorator.add',
      decorator: 'strong',
    })

    // After adding: "f" + "oob" (strong) + "ar" — three spans
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[strong:^oob|]ar',
      )
    })

    editor.send({type: 'history.undo'})

    // After undo: back to original value
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: Undoing annotation add across a range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link'}],
      }),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    // Select "oob" (offset 1 to 4)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    const annotationKey = keyGenerator()

    editor.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        _key: annotationKey,
        value: {href: 'https://example.com'},
      },
    })

    // After adding: "f" + "oob" (link) + "ar" — three spans
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[@link:^oob|]ar',
      )
    })

    editor.send({type: 'history.undo'})

    // After undo: back to original value
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: Undoing a bold shortcut over part of a span restores the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[strong:^oob|]ar',
      )
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}',
    )

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      })
    })
  })

  test('Scenario: forward-only behavior merges consecutive typing into one undo step', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [({event}) => [forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: ab|')
    })

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
  })

  test('Scenario: Remote-fallout normalization is not undoable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialBlock = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [initialBlock],
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

    // A remote insert lands a second span with the same key as the first,
    // firing the engine's duplicate-key fix during remote processing. The
    // fix reports `origin: 'normalization'`, not `'remote'`, so the
    // history subscriber must skip it by the remote frame on the operation
    // event, or the remote-triggered `set` becomes a local undo step.
    const duplicateSpan = {
      _type: 'span',
      _key: spanKey,
      text: 'bar',
      marks: ['strong'],
    }
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [duplicateSpan],
          origin: 'remote',
        },
      ],
    })

    const repairedValue = [
      {
        ...initialBlock,
        children: [initialBlock.children[0], {...duplicateSpan, _key: 'k4'}],
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(repairedValue)
    })

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual(repairedValue)
  })

  test('Scenario: Undoing gallery deletion restores its children', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      gallery(galleryKey, itemKey, 'a'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                patches.push(changePatch)
              }
            }
          }}
        />
      ),
    })

    editor.send({type: 'delete.block', at: [{_key: galleryKey}]})
    await vi.waitFor(() => {
      expect(applyAll(initialValue, patches)).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(applyAll(initialValue, patches)).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'gallery',
          _key: galleryKey,
          title: 'T',
          children: [{_type: 'item', _key: itemKey, label: 'a'}],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'gallery',
          _key: galleryKey,
          title: 'T',
          children: [{_type: 'item', _key: itemKey, label: 'a'}],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  describe('Undoing a text deletion after a remote text change', () => {
    test('Scenario: A remote insert before the deleted text in the same span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 7},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'xfoo', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo bar')
      })
    })

    test('Scenario: A remote insert before the deleted text that is longer than the text in front of it', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 7},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'baz foo', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: baz foo')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: baz foo bar',
        )
      })
    })

    test('Scenario: A remote delete before the deleted text in the same span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 8},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo baz')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo baz', 'fo baz', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fo baz')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: fo bar baz',
        )
      })
    })

    test('Scenario: A remote insert after the deleted text in the same span', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 4},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: bar baz')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('bar baz', 'bar xbaz', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: bar xbaz')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: foo bar xbaz',
        )
      })
    })

    test('Scenario: A remote delete before the deleted text behind multi-byte characters', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'éééééfoox bar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 8},
          focus: {path: spanPath, offset: 9},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: éééééfoo bar',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('éééééfoo bar', 'ééééé bar', [
              ...spanPath,
              'text',
            ]),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: ééééé bar')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: éééééx bar',
        )
      })
    })

    test('Scenario: A remote delete before the deleted text behind surrogate pairs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: '😀😀😀foox bar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 9},
          focus: {path: spanPath, offset: 10},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: 😀😀😀foo bar',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('😀😀😀foo bar', '😀😀😀 bar', [
              ...spanPath,
              'text',
            ]),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: 😀😀😀 bar',
        )
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: 😀😀😀x bar',
        )
      })
    })

    test('Scenario: A remote insert where the deleted text was', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 7},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'foox', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo barx')
      })
    })

    test('Scenario: A remote insert in another span of the same block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
              {_type: 'span', _key: barSpanKey, text: ' bar baz', marks: []},
            ],
          },
        ],
      })
      const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
      const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: barSpanPath, offset: 1},
          focus: {path: barSpanPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:foo] baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'xfoo', [...fooSpanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:xfoo] baz',
        )
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:xfoo] bar baz',
        )
      })
    })

    test('Scenario: A remote insert in another span before the offset of the deleted text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: ['strong']},
              {_type: 'span', _key: barSpanKey, text: ' barx baz', marks: []},
            ],
          },
        ],
      })
      const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
      const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: barSpanPath, offset: 4},
          focus: {path: barSpanPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:foo] bar baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'xfoo', [...fooSpanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:xfoo] bar baz',
        )
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:xfoo] barx baz',
        )
      })
    })
    test('Scenario: A remote insert at the deleted text, then a remote multi-byte replacement before it', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'abcdefghijklmnopqrstuvwxyzx baz',
                marks: [],
              },
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 26},
          focus: {path: spanPath, offset: 27},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: abcdefghijklmnopqrstuvwxyz baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch(
              'abcdefghijklmnopqrstuvwxyz baz',
              'abcdefghijklmnopqrstuvwxyzbar baz',
              [...spanPath, 'text'],
            ),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: abcdefghijklmnopqrstuvwxyzbar baz',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch(
              'abcdefghijklmnopqrstuvwxyzbar baz',
              'ébcdefghijklmnopqrstuvwxyzbar baz',
              [...spanPath, 'text'],
            ),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: ébcdefghijklmnopqrstuvwxyzbar baz',
        )
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: ébcdefghijklmnopqrstuvwxyzxbar baz',
        )
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: ébcdefghijklmnopqrstuvwxyzbar baz',
        )
      })
    })
    test('Scenario: Typing that merges into a step after a remote insert before it', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
        },
      })
      editor.send({type: 'insert.text', text: 'b'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foob|')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foob', 'xfoob', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoob|')
      })

      editor.send({type: 'insert.text', text: 'a'})
      editor.send({type: 'insert.text', text: 'r'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoobar|')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo')
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoobar|')
      })
    })
  })

  describe('Undoing a text deletion after a remote text change in a container', () => {
    test('Scenario: A remote insert before the deleted text in the same span in a table cell', async () => {
      const keyGenerator = createTestKeyGenerator()
      const keys = nestedKeys(keyGenerator)
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: nestedSchemaDefinition,
        initialValue: [tableWithText(keys, 'foo bar')],
        children: <NodePlugin nodes={[tableContainer]} />,
      })
      const spanPath = [
        {_key: keys.table},
        'rows',
        {_key: keys.row},
        'cells',
        {_key: keys.cell},
        'content',
        {_key: keys.block},
        'children',
        {_key: keys.span},
      ]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 7},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithText(keys, 'foo'),
        ])
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'xfoo', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithText(keys, 'xfoo'),
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithText(keys, 'xfoo bar'),
        ])
      })
    })

    test('Scenario: A remote insert before the deleted text in the same span in a callout in a table cell', async () => {
      const keyGenerator = createTestKeyGenerator()
      const keys = nestedKeys(keyGenerator)
      const calloutKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: nestedSchemaDefinition,
        initialValue: [tableWithCallout(keys, calloutKey, 'foo bar')],
        children: <NodePlugin nodes={[tableContainer, calloutContainer]} />,
      })
      const spanPath = [
        {_key: keys.table},
        'rows',
        {_key: keys.row},
        'cells',
        {_key: keys.cell},
        'content',
        {_key: calloutKey},
        'content',
        {_key: keys.block},
        'children',
        {_key: keys.span},
      ]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 7},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithCallout(keys, calloutKey, 'foo'),
        ])
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'xfoo', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithCallout(keys, calloutKey, 'xfoo'),
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          tableWithCallout(keys, calloutKey, 'xfoo bar'),
        ])
      })
    })
  })

  describe('Undoing a merged step after a remote text change', () => {
    test('Scenario: A remote insert after a merged backward deletion', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foobar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 6},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooba')
      })
      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foob')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foob', 'foobx', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobx')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobarx')
      })
    })

    test('Scenario: A remote insert after a merged backward deletion of a surrogate pair', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'fooé😀', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 6},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooé')
      })
      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 4},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foo', 'foox', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooé😀x')
      })
    })

    test('Scenario: A remote insert after two separate deletions', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foobar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 6},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooba')
      })

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 2},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foba')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foba', 'fobax', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fobax')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobax')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobarx')
      })
    })

    test('Scenario: A remote insert after merged backspaces restores the saved selection', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'foobar', marks: []},
            ],
          },
        ],
      })
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 6},
          focus: {path: spanPath, offset: 6},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')
      })

      await userEvent.keyboard('{Backspace}{Backspace}')

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foob|')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foob', 'foobx', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobx|')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|x')
      })
    })

    test('Scenario: A remote insert after typing and deleting in the same step', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: spanKey, text: 'abfoo', marks: []},
            ],
          },
        ],
        children: (
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'insert.text',
                guard: ({event}) => event.text === 'b',
                actions: [
                  ({event}) => [
                    execute(event),
                    execute({
                      type: 'delete',
                      at: {
                        anchor: {path: spanPath, offset: 0},
                        focus: {path: spanPath, offset: 2},
                      },
                    }),
                  ],
                ],
              }),
            ]}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
        },
      })
      editor.send({type: 'insert.text', text: 'b'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foob|')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foob', 'foobx', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobx|')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: abfoo|x')
      })
    })

    test('Scenario: A remote insert inside locally inserted text', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          },
        ],
      })

      editor.send({
        type: 'insert.text',
        at: spanPath,
        offset: 3,
        text: 'bar',
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar')
      })

      editor.send({
        type: 'apply',
        patches: [
          {
            ...diffMatchPatch('foobar', 'foobxar', [...spanPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobxar')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox')
      })
    })
  })

  describe('Undoing after a remote span removal emptied a step', () => {
    test('Scenario: Undo passes a step emptied by a remote span removal', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: fooKey, text: 'foo', marks: []},
              {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            ],
          },
        ],
      })
      const fooPath = [{_key: blockKey}, 'children', {_key: fooKey}]
      const barPath = [{_key: blockKey}, 'children', {_key: barKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: barPath, offset: 0},
          focus: {path: barPath, offset: 1},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: foo[strong:ar]',
        )
      })
      editor.send({
        type: 'delete',
        at: {
          anchor: {path: fooPath, offset: 0},
          focus: {path: fooPath, offset: 1},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: oo[strong:ar]',
        )
      })

      editor.send({
        type: 'apply',
        patches: [{type: 'unset', path: fooPath, origin: 'remote'}],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:ar]',
        )
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:bar]',
        )
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: [strong:ar]',
        )
      })
    })

    test('Scenario: A deletion after a remote span removal emptied the last step', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const bazKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: fooKey, text: 'foobar', marks: []},
              {_type: 'span', _key: bazKey, text: 'baz', marks: ['strong']},
            ],
          },
        ],
      })
      const fooPath = [{_key: blockKey}, 'children', {_key: fooKey}]
      const bazPath = [{_key: blockKey}, 'children', {_key: bazKey}]

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: fooPath, offset: 5},
          focus: {path: fooPath, offset: 6},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: fooba[strong:baz]',
        )
      })
      editor.send({
        type: 'delete',
        at: {
          anchor: {path: bazPath, offset: 2},
          focus: {path: bazPath, offset: 3},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          'B: fooba[strong:ba]',
        )
      })

      editor.send({
        type: 'apply',
        patches: [
          {type: 'unset', path: bazPath, origin: 'remote'},
          {
            ...diffMatchPatch('fooba', 'xfooba', [...fooPath, 'text']),
            origin: 'remote',
          },
        ],
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfooba')
      })

      editor.send({
        type: 'delete',
        at: {
          anchor: {path: fooPath, offset: 4},
          focus: {path: fooPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfooa')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfooba')
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoobar')
      })
    })
  })

  test('Scenario: History keeps no remote operations once its steps are rebased', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
        },
      ],
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 6},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    for (let index = 0; index < 20; index++) {
      editor.send({
        type: 'apply',
        patches: [
          {
            ...(index % 2 === 0
              ? diffMatchPatch('foo', 'xfoo', [...spanPath, 'text'])
              : diffMatchPatch('xfoo', 'foo', [...spanPath, 'text'])),
            origin: 'remote',
          },
        ],
      })
    }

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar')
    })

    expect(engineRef.current!.history).toEqual({
      undos: [],
      redos: [
        {
          operations: [
            {type: 'remove.text', path: spanPath, offset: 3, text: 'bar'},
          ],
        },
      ],
    })
  })
})

function nestedKeys(keyGenerator: () => string) {
  return {
    table: keyGenerator(),
    row: keyGenerator(),
    cell: keyGenerator(),
    block: keyGenerator(),
    span: keyGenerator(),
  }
}

function tableWithText(
  keys: ReturnType<typeof nestedKeys>,
  text: string,
): PortableTextBlock {
  return table(keys, [nestedTextBlock(keys, text)])
}

function tableWithCallout(
  keys: ReturnType<typeof nestedKeys>,
  calloutKey: string,
  text: string,
): PortableTextBlock {
  return table(keys, [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [nestedTextBlock(keys, text)],
    },
  ])
}

function table(
  keys: ReturnType<typeof nestedKeys>,
  content: Array<Record<string, unknown>>,
): PortableTextBlock {
  return {
    _type: 'table',
    _key: keys.table,
    rows: [
      {
        _type: 'row',
        _key: keys.row,
        cells: [{_type: 'cell', _key: keys.cell, content}],
      },
    ],
  }
}

function nestedTextBlock(keys: ReturnType<typeof nestedKeys>, text: string) {
  return {
    _type: 'block',
    _key: keys.block,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keys.span, text, marks: []}],
  }
}

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function gallery(key: string, itemKey: string, label: string) {
  return {
    _type: 'gallery',
    _key: key,
    title: 'T',
    children: [{_type: 'item', _key: itemKey, label}],
  }
}
