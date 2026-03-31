import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

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
      expect(editor.getSnapshot().context.value).toMatchObject([
        {_type: 'block', children: [{_type: 'span', text: 'foo'}]},
        {_type: 'code', code: 'const x = 1', language: 'typescript'},
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,banewr, buz',
      ])
    })
  })
})
