import {isSpan} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type Editor, type Path} from '../src'
import {effect, execute, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('event.insert.text', () => {
  test('Scenario: Consecutive `insert.text` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        backward: false,
      })
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooba|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        backward: false,
      })
    })
  })

  test('Scenario: `insert.text` can trigger `insert.child` events', async () => {
    const insertChildEvents: Array<BehaviorEvent> = []
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              actions: [
                ({event}) => [
                  effect(() => {
                    insertChildEvents.push(event)
                  }),
                  forward(event),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(insertChildEvents).toEqual([
        {
          type: 'insert.child',
          child: {
            _type: 'span',
            text: 'b',
            marks: ['strong'],
          },
        },
      ])
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(insertChildEvents.slice(1)).toEqual([
        {
          type: 'insert.child',
          child: {
            _type: 'span',
            text: ' ',
            marks: [],
          },
        },
      ])
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo [strong:bar] baz|',
      )
    })
  })

  test('Scenario: executing `insert.text` events', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: executing after annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [linkKey],
            },
          ],
          markDefs: [{_key: linkKey, _type: 'link'}],
          style: 'normal',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.type(locator, ' bar')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar', marks: [linkKey]},
          ],
          markDefs: [{_key: linkKey, _type: 'link'}],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Ignoring `insert.child` events for spans using `forward`', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              guard: ({snapshot, event}) => {
                if (isSpan(snapshot.context, event.child)) {
                  return {span: event.child}
                }

                return false
              },
              actions: [
                (_, {span}) => [
                  forward({type: 'insert.text', text: span.text}),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: Ignoring `insert.child` events for spans using `execute`', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              guard: ({snapshot, event}) => {
                if (isSpan(snapshot.context, event.child)) {
                  return {span: event.child}
                }

                return false
              },
              actions: [
                (_, {span}) => [
                  execute({type: 'insert.text', text: span.text}),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: Inserting text without a selection', async () => {
    const {editor} = await createTestEditor()

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })
  })

  test('Scenario: Inserting text on a block object is a no-op', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    editor.send({type: 'insert.text', text: 'foo'})

    // Give the editor time to process the event
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(errorSpy).not.toHaveBeenCalled()
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: imageKey,
        _type: 'image',
        src: 'https://example.com/image.jpg',
      },
    ])

    errorSpy.mockRestore()
  })

  test('Scenario: Inserting text at an inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const inlineKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'before', marks: []},
            {_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'},
            {_type: 'span', _key: spanBKey, text: 'after', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: before{stock-ticker symbol="AAPL"}after',
      )
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'hello'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: before{stock-ticker symbol="AAPL"}hello|after',
      )
    })
  })

  test('Scenario: `insert.text` at an explicit position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 5,
      text: ' world',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'hello world', marks: []},
          ],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: `insert.text` inserts at a pending DOM selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    const fooPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const barPath = [{_key: barBlockKey}, 'children', {_key: barSpanKey}]
    const fooTextNode = getSpanTextNode(editor, fooPath)
    const barTextNode = getSpanTextNode(editor, barPath)

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {path: barPath, offset: 3},
        focus: {path: barPath, offset: 3},
      },
    })

    await vi.waitFor(() => {
      const domSelection = document.getSelection()
      expect({
        model: editor.getSnapshot().context.selection,
        dom: {
          anchorNode: domSelection?.anchorNode,
          anchorOffset: domSelection?.anchorOffset,
          focusNode: domSelection?.focusNode,
          focusOffset: domSelection?.focusOffset,
        },
      }).toEqual({
        model: {
          anchor: {path: barPath, offset: 3},
          focus: {path: barPath, offset: 3},
          backward: false,
        },
        dom: {
          anchorNode: barTextNode,
          anchorOffset: 3,
          focusNode: barTextNode,
          focusOffset: 3,
        },
      })
    })

    document.getSelection()!.collapse(fooTextNode, 3)
    document.dispatchEvent(new Event('selectionchange'))

    editor.send({type: 'insert.text', text: 'x'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foox', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: fooPath, offset: 4},
        focus: {path: fooPath, offset: 4},
        backward: false,
      })
    })
  })
})

function getSpanTextNode(editor: Editor, spanPath: Path): Node {
  const snapshot = editor.getSnapshot()
  const point = {path: spanPath, offset: 0}
  const [spanNode] = editor.dom.getChildNodes({
    ...snapshot,
    context: {...snapshot.context, selection: {anchor: point, focus: point}},
  })
  const textNode = spanNode
    ? document.createTreeWalker(spanNode, NodeFilter.SHOW_TEXT).nextNode()
    : null

  if (!textNode) {
    throw new Error('Could not find the text node of the span')
  }

  return textNode
}
