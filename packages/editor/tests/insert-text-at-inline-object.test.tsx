import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

const schema = defineSchema({
  inlineObjects: [{name: 'stock-ticker'}],
})

describe('insert text at inline object', () => {
  test('Scenario: insert.text with selection at an inline ObjectNode inserts into adjacent span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: keyGenerator()},
            {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: schema,
    })

    // Keys: k0 = block, k1 = first span ("foo"), k2 = stock-ticker, k3 = second span ("bar")

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Place the cursor at the inline ObjectNode (stock-ticker)
    editor.send({
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
    })

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      const childSegment = selection?.focus.path.at(2)
      expect(childSegment).toEqual({_key: 'k2'})
    })

    // Send insert.text while cursor is at the ObjectNode
    editor.send({type: 'insert.text', text: 'hello'})

    // The text should be inserted into the adjacent span (after the ObjectNode)
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo,{stock-ticker},hellobar',
      ])
    })
  })
})
