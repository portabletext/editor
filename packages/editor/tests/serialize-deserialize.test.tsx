import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {execute, forward, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

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
      JSON.stringify([
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo bar baz',
        '{image}',
      ])
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
      JSON.stringify([
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

    // And text/html is put on the clipboard
    expect(dataTransfer.getData('text/html')).toEqual('<p>foo bar baz</p>')

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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'Overwritten HTML',
      ])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
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
            // since the Behavior above (with higher priority) merely
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['fizz buzz'])
    })
  })
})
