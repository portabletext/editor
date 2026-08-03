import {defineSchema} from '@portabletext/schema'
import {expect, test, vi} from 'vitest'
import {getActiveStyle} from '../src/selectors/selector.get-active-style'
import {createTestEditor} from '../src/test/vitest'

const blockMissingStyle = {
  _key: 'b0',
  _type: 'block',
  markDefs: [],
  children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
}

test('Scenario: toggling the default style on a block missing `style` is a no-op that keeps reading as the default', async () => {
  const {editor} = await createTestEditor({
    schemaDefinition: defineSchema({
      styles: [{name: 'normal'}, {name: 'h2'}],
    }),
    initialValue: [blockMissingStyle],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 1},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 1},
    },
  })
  // The missing `style` reads as the default, so the toggle takes the
  // active branch: `style.remove` unsets the field, and unsetting a
  // field the block never had applies nothing, so nothing dirties and
  // no touch-fill runs. No write for a visual no-op.
  editor.send({type: 'style.toggle', style: 'normal'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([blockMissingStyle])
    expect(getActiveStyle(editor.getSnapshot())).toBe('normal')
  })
})

test('Scenario: toggling a non-default style on a block missing `style` sets it', async () => {
  const {editor} = await createTestEditor({
    schemaDefinition: defineSchema({
      styles: [{name: 'normal'}, {name: 'h2'}],
    }),
    initialValue: [blockMissingStyle],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 1},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 1},
    },
  })
  editor.send({type: 'style.toggle', style: 'h2'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {...blockMissingStyle, style: 'h2'},
    ])
  })
})
