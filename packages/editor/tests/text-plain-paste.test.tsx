import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'
import {toTextspec} from '../test-utils/to-textspec'

describe('`text/plain` paste', () => {
  test('Scenario: Consumer behavior on `deserialize.data` can produce rich blocks from `text/plain`', async () => {
    const keyGenerator = createTestKeyGenerator()

    // A consumer behavior that intercepts text/plain and produces blocks
    // with a code block object (not a text block)
    const markdownPasteBehavior = defineBehavior({
      on: 'deserialize.data',
      guard: ({event}) => {
        if (event.mimeType !== 'text/plain') {
          return false
        }

        if (event.data.startsWith('```')) {
          return {
            blocks: [
              {
                _type: 'code',
                _key: keyGenerator(),
                code: event.data
                  .replace(/```\w*\n?/, '')
                  .replace(/\n?```$/, ''),
                language: 'typescript',
              },
            ],
          }
        }

        return false
      },
      actions: [
        ({event}, {blocks}) => [
          raise({
            type: 'deserialization.success',
            data: blocks,
            mimeType: event.mimeType,
            originEvent: event.originEvent,
          }),
        ],
      ],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: {
        blockObjects: [
          {
            name: 'code',
            fields: [
              {name: 'code', type: 'string'},
              {name: 'language', type: 'string'},
            ],
          },
        ],
      },
      children: <BehaviorPlugin behaviors={[markdownPasteBehavior]} />,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    await userEvent.click(locator)

    // Place caret after "foo"
    await vi.waitFor(() => {
      const selection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foo',
      )
      editor.send({type: 'select', at: selection})
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Paste text/plain containing a fenced code block
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', '```ts\nconst x = 1\n```')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // The code block object should be inserted, NOT stripped to plain text
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
        },
        {
          _type: 'code',
          _key: 'k4',
          code: 'const x = 1',
          language: 'typescript',
        },
      ])
    })
  })

  test('Scenario: Pasted `text/plain` inherits formatting from surrounding text', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: {
        decorators: [{name: 'strong'}],
      },
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo ', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'bar',
              marks: ['strong'],
            },
            {_key: keyGenerator(), _type: 'span', text: ' buz', marks: []},
          ],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    await userEvent.click(locator)

    // Place caret after "ba" (inside the bold span)
    await vi.waitFor(() => {
      const selection = getSelectionAfterText(
        editor.getSnapshot().context,
        'ba',
      )
      editor.send({type: 'select', at: selection})
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Paste plain text into the bold span
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'new')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    // The pasted text should inherit the bold formatting
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo [strong:banew|r] buz',
      )
    })
  })

  test('Scenario: Pasted `text/plain` inherits formatting even when a consumer behavior raises `deserialization.success` directly', async () => {
    // Mirror the playground's markdown-deserializer pattern: a consumer
    // behavior catches `deserialize.data` for `text/plain` and emits
    // `deserialization.success` with a bare text block. This bypasses the
    // engine's abstract `text/plain` -> `insert.span` behavior that inherits
    // active marks. The engine should still inherit active marks when the
    // resulting `insert.blocks` merges a bare span at a caret in a text block.
    const keyGenerator = createTestKeyGenerator()

    const consumerDeserializer = defineBehavior({
      on: 'deserialize.data',
      guard: ({event}) => {
        if (event.mimeType !== 'text/plain') {
          return false
        }

        return {
          blocks: [
            {
              _type: 'block',
              _key: keyGenerator(),
              children: [
                {
                  _type: 'span',
                  _key: keyGenerator(),
                  text: event.data,
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        }
      },
      actions: [
        ({event}, {blocks}) => [
          raise({
            type: 'deserialization.success',
            data: blocks,
            mimeType: event.mimeType,
            originEvent: event.originEvent,
          }),
        ],
      ],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: {
        decorators: [{name: 'strong'}],
      },
      children: <BehaviorPlugin behaviors={[consumerDeserializer]} />,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo ', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'bar',
              marks: ['strong'],
            },
            {_key: keyGenerator(), _type: 'span', text: ' buz', marks: []},
          ],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    await userEvent.click(locator)

    // Place caret inside the bold span, after "ba"
    await vi.waitFor(() => {
      const selection = getSelectionAfterText(
        editor.getSnapshot().context,
        'ba',
      )
      editor.send({type: 'select', at: selection})
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'new')
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {
        selection: editor.getSnapshot().context.selection!,
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo [strong:banew|r] buz',
      )
    })
  })
})
