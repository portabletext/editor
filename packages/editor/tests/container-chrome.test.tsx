import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineContainer, defineSchema} from '../src'
import {NodePlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

const schema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

function block(key: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-s`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

// Editable-outer topology: the outer stays editable, chrome is a
// `contentEditable={false}` island, the body is plain editable content.
const calloutWithChrome = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children}) => (
    <div {...attributes}>
      <div contentEditable={false} data-testid="chrome">
        CHROME
      </div>
      <div>{children}</div>
    </div>
  ),
})

function setup() {
  return createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: schema,
    initialValue: [
      block('before', 'before'),
      {_type: 'callout', _key: 'callout', content: [block('inner', 'inside')]},
      block('after', 'after'),
    ],
    children: <NodePlugin nodes={[calloutWithChrome]} />,
  })
}

const calloutPath = [{_key: 'callout'}]
const innerSpanPath = [
  {_key: 'callout'},
  'content',
  {_key: 'inner'},
  'children',
  {_key: 'inner-s'},
]

describe('container chrome', () => {
  test('clicking the chrome selects the container as a block-object', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByTestId('chrome'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        calloutPath,
      )
    })
  })

  test('clicking the body places a caret in the body', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByText('inside'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        innerSpanPath,
      )
    })
  })

  test('Backspace with the container selected deletes it', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByTestId('chrome'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        calloutPath,
      )
    })
    editor.send({type: 'delete.backward', unit: 'character'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.map((b) => b._type)).toEqual([
        'block',
        'block',
      ])
    })
  })

  test('ArrowDown from the selected container moves to the next block', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByTestId('chrome'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        calloutPath,
      )
      expect(document.activeElement?.closest('[data-pt-editor]')).not.toBeNull()
    })
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path?.[0]).toEqual({
        _key: 'after',
      })
    })
  })
})
