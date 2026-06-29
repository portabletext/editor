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
const blk = (k: string, t: string) => ({
  _type: 'block',
  _key: k,
  children: [{_type: 'span', _key: `${k}-s`, text: t, marks: []}],
  markDefs: [],
  style: 'normal',
})

const container = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, spacer, children}) => (
    <div {...attributes} style={{position: 'relative'}}>
      {spacer}
      <div style={{position: 'relative', zIndex: 10}}>{children}</div>
    </div>
  ),
})

const calloutPath = [{_key: 'callout'}]
const spanPath = [
  {_key: 'callout'},
  'content',
  {_key: 'inner'},
  'children',
  {_key: 'inner-s'},
]

function setup() {
  return createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: schema,
    initialValue: [
      blk('before', 'before'),
      {_type: 'callout', _key: 'callout', content: [blk('inner', 'inside')]},
      blk('after', 'after'),
    ],
    children: <NodePlugin nodes={[container]} />,
  })
}

function selectSpacer(root: HTMLElement) {
  const zw = root.querySelector('[data-pt-spacer] [data-pt-zero-width]')
  const textNode = zw?.firstChild
  if (!textNode) {
    throw new Error('no spacer zero-width found')
  }
  const sel = window.getSelection()!
  const range = document.createRange()
  range.setStart(textNode, 0)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

describe('container spacer selection', () => {
  test('selecting the spacer holds the container path', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByText('inside')) // focus the editor
    selectSpacer(locator.element() as HTMLElement)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        calloutPath,
      )
    })
  })

  test('clicking the body still carets', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByText('inside'))
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        spanPath,
      )
    })
  })

  test('Backspace with the container selected deletes it', async () => {
    const {editor, locator} = await setup()
    await userEvent.click(locator.getByText('before'))
    selectSpacer(locator.element() as HTMLElement)
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
    await userEvent.click(locator.getByText('before'))
    selectSpacer(locator.element() as HTMLElement)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        calloutPath,
      )
    })
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path?.[0]).toEqual({
        _key: 'after',
      })
    })
  })
})
