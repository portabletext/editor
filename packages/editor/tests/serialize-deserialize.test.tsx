import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {execute, forward, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {safeStringify} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {getSelectionText} from '../src/selectors/selector.get-selection-text'
import {createTestEditor} from '../src/test/vitest'
import {getTextSelection} from '../test-utils/text-selection'
import {toTextspec} from '../test-utils/to-textspec'

describe('Serialize/Deserialize', () => {
  test('Scenario: Custom text/html deserializer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        // Given a custom plugin for serializing and deserializing text/html
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'serialize.data',
              guard: ({event}) => event.mimeType === 'text/html',
              actions: [
                ({event}) => [
                  raise({
                    type: 'serialization.success',
                    mimeType: 'text/html',
                    data: '<img src="https://example.com/image.png" />',
                    originEvent: event.originEvent,
                  }),
                ],
              ],
            }),
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/html',
              actions: [
                ({snapshot, event}) => [
                  raise({
                    type: 'deserialization.success',
                    mimeType: 'text/html',
                    data: [
                      {
                        _type: 'image',
                        _key: snapshot.context.keyGenerator(),
                        src: 'https://example.com/image.png',
                      },
                    ],
                    originEvent: event.originEvent,
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
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    })

    const fooBarBazSelection = getTextSelection(
      editor.getSnapshot().context,
      'foo bar baz',
    )

    await userEvent.click(locator)
    // When "foo bar baz" is selected
    editor.send({
      type: 'select',
      at: fooBarBazSelection,
    })
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({...fooBarBazSelection, backward: false})
    })

    // And a cut is performed
    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {
        selection: fooBarBazSelection!,
      },
    })

    // Then custom text/html is put on the clipboard
    expect(dataTransfer.getData('text/html')).toBe(
      '<img src="https://example.com/image.png" />',
    )

    // And standard application/x-portable-text is put on the clipboard
    expect(dataTransfer.getData('application/x-portable-text')).toEqual(
      safeStringify([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]),
    )

    // And the text is ""
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })

    // When a paste is performed
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // Then the text is "foo bar baz"
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })

    // However, when only text/plain and text/html is pasted
    const newDataTransfer = new DataTransfer()
    newDataTransfer.setData('text/plain', 'hey')
    newDataTransfer.setData('text/html', '<strong>hey</strong>')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer: newDataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // The custom HTML deserializer takes precedence
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'B: foo bar baz',
          '^{IMAGE src="https://example.com/image.png"}|',
        ].join('\n'),
      )
    })
  })

  test('Scenario: Fallback on failing deserialization', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            // Given a custom plugin that deliberately fails to deserialize
            // application/x-portable-text and application/json
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => {
                if (
                  event.mimeType === 'application/x-portable-text' ||
                  event.mimeType === 'application/json'
                ) {
                  return true
                }

                return false
              },
              actions: [
                ({event}) => [
                  raise({
                    type: 'deserialization.failure',
                    mimeType: event.mimeType,
                    reason: 'Not implemented',
                    originEvent: event.originEvent,
                  }),
                ],
              ],
            }),
            // And a custom plugin that alters the deserialization of text/html
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/html',
              actions: [
                ({event}) => [
                  raise({
                    type: 'deserialization.success',
                    mimeType: event.mimeType,
                    data: [
                      {
                        _type: 'block',
                        _key: blockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: spanKey,
                            text: 'Overwritten HTML',
                          },
                        ],
                      },
                    ],
                    originEvent: event.originEvent,
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
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
            },
          ],
          markDefs: [],
          style: 'h1',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'h1'}],
      }),
    })

    const fooBarBazSelection = getTextSelection(
      editor.getSnapshot().context,
      'foo bar baz',
    )

    await userEvent.click(locator)
    // When "foo bar baz" is selected
    editor.send({
      type: 'select',
      at: fooBarBazSelection,
    })

    // And a cut is performed
    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {
        selection: fooBarBazSelection!,
      },
    })

    // Then application/x-portable-text is put on the clipboard
    expect(dataTransfer.getData('application/x-portable-text')).toEqual(
      safeStringify([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'h1',
        },
      ]),
    )

    // Core ships no text/markdown converter, so nothing is written for it
    expect(dataTransfer.getData('text/markdown')).toEqual('')

    // And text/html is put on the clipboard
    expect(dataTransfer.getData('text/html')).toEqual('<h1>foo bar baz</h1>')

    // When a paste is performed
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // Then the text is "Overwritten HTML"
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: Overwritten HTML|',
      )
    })
  })

  test('Scenario: Unconfigured `text/markdown` paste falls forward to `text/plain`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/markdown', '# heading')
    dataTransfer.setData('text/plain', 'heading')

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // No `text/markdown` converter or Behavior exists, so the paste falls
    // forward to `text/plain` instead of dead-ending
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: heading|')
    })

    // The fall-forward recovers, so it's not a terminal failure worth
    // warning about
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  test('Scenario: Consumer `deserialize.data` Behavior receives `text/markdown`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/markdown',
              actions: [
                ({event}) => [
                  raise({
                    type: 'deserialization.success',
                    mimeType: 'text/markdown',
                    data: [
                      {
                        _type: 'block',
                        _key: blockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: keyGenerator(),
                            text: event.data,
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                    originEvent: event.originEvent,
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/markdown', '# heading')
    dataTransfer.setData('text/plain', 'heading')

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // The consumer Behavior received the raw `text/markdown` data, not the
    // `text/plain` fallback
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: # heading|')
    })
  })

  test('Scenario: Consumer `serialize.data` Behavior writes `text/markdown`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'serialize.data',
              guard: ({event}) => event.mimeType === 'text/markdown',
              actions: [
                ({snapshot, event}) => [
                  raise({
                    type: 'serialization.success',
                    mimeType: 'text/markdown',
                    data: `md:${getSelectionText(snapshot).toUpperCase()}`,
                    originEvent: event.originEvent,
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
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    const fooBarBazSelection = getTextSelection(
      editor.getSnapshot().context,
      'foo bar baz',
    )

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: fooBarBazSelection,
    })
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({...fooBarBazSelection, backward: false})
    })

    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {
        selection: fooBarBazSelection!,
      },
    })

    // The consumer Behavior's entry is additive: text/markdown carries the
    // custom encoding while text/plain still carries the core converter's
    // untouched output
    expect(dataTransfer.getData('text/markdown')).toEqual('md:FOO BAR BAZ')
    expect(dataTransfer.getData('text/plain')).toEqual('foo bar baz')
  })

  test('Scenario: Round-trip through consumer `text/markdown` Behaviors', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'serialize.data',
              guard: ({event}) => event.mimeType === 'text/markdown',
              actions: [
                ({snapshot, event}) => [
                  raise({
                    type: 'serialization.success',
                    mimeType: 'text/markdown',
                    data: `md:${getSelectionText(snapshot).toUpperCase()}`,
                    originEvent: event.originEvent,
                  }),
                ],
              ],
            }),
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/markdown',
              actions: [
                ({snapshot, event}) => [
                  raise({
                    type: 'deserialization.success',
                    mimeType: 'text/markdown',
                    data: [
                      {
                        _type: 'block',
                        _key: snapshot.context.keyGenerator(),
                        children: [
                          {
                            _type: 'span',
                            _key: snapshot.context.keyGenerator(),
                            text: event.data.slice('md:'.length),
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                    originEvent: event.originEvent,
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
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo bar baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    const fooBarBazSelection = getTextSelection(
      editor.getSnapshot().context,
      'foo bar baz',
    )

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: fooBarBazSelection,
    })
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({...fooBarBazSelection, backward: false})
    })

    // Cutting clears the block, leaving an empty position to paste back into
    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {
        selection: fooBarBazSelection!,
      },
    })

    expect(dataTransfer.getData('text/markdown')).toEqual('md:FOO BAR BAZ')
    expect(dataTransfer.getData('text/plain')).toEqual('foo bar baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })

    // Pasting only text/markdown and text/plain isolates the contest
    // between them; application/x-portable-text and application/json
    // outrank both and would otherwise round-trip the original casing
    // through the core editor-to-editor lane instead
    const pasteDataTransfer = new DataTransfer()
    pasteDataTransfer.setData(
      'text/markdown',
      dataTransfer.getData('text/markdown'),
    )
    pasteDataTransfer.setData('text/plain', dataTransfer.getData('text/plain'))

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer: pasteDataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // The markdown lane won the paste priority over text/plain: the
    // pasted text is uppercase, which the text/plain entry ("foo bar
    // baz") could not have produced on its own
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: FOO BAR BAZ|',
      )
    })
  })

  test('Scenario: Executing deserialize', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'deserialize',
              actions: [({event}) => [execute(event)]],
            }),
            // This Behavior won't receive the `deserialize.data` event since
            // the Behavior above (with higher priority) executes the
            // `deserialize` event (which means that no other custom Behavior
            // can intercept the event propagation).
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/html',
              actions: [
                ({event}) => [
                  forward({
                    ...event,
                    data: '<p>fizz buzz</p>',
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    })

    await userEvent.click(locator)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/html', '<p>foo bar baz</p>')

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: Forwarding deserialize', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'deserialize',
              actions: [({event}) => [forward(event)]],
            }),
            // This Behavior *will* receive the `deserialize.data` event
            // since the Behavior above (with higher priority) only
            // forwards the `deserialize` event.
            defineBehavior({
              on: 'deserialize.data',
              guard: ({event}) => event.mimeType === 'text/html',
              actions: [
                ({event}) => [
                  forward({
                    ...event,
                    data: '<p>fizz buzz</p>',
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    })

    await userEvent.click(locator)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/html', '<p>foo bar baz</p>')

    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fizz buzz|')
    })
  })
})
