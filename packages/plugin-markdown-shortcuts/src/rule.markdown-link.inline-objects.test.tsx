import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {createMarkdownLinkRule} from './rule.markdown-link'

const markdownLinkRule = createMarkdownLinkRule({
  linkObject: ({props}) => ({
    _type: 'link',
    href: props.href,
  }),
})

function createInlineObjectTestEditor() {
  return createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: <InputRulePlugin rules={[markdownLinkRule]} />,
    schemaDefinition: defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      inlineObjects: [{name: 'stock-ticker'}],
    }),
  })
}

test('Scenario: linkifying a markdown link whose text spans an inline object', async () => {
  const {editor} = await createInlineObjectTestEditor()

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: '[foo'})
  editor.send({
    type: 'insert.child',
    child: {_type: 'stock-ticker', _key: 'ticker0'},
  })
  editor.send({type: 'insert.text', text: ' bar](url'})
  editor.send({type: 'insert.text', text: ')'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 'k5', text: 'foo', marks: ['k3']},
          {_type: 'stock-ticker', _key: 'ticker0'},
          {_type: 'span', _key: 'k2', text: ' bar', marks: ['k3']},
        ],
        markDefs: [{_key: 'k3', _type: 'link', href: 'url'}],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: a markdown link with an inline object in the href stays literal', async () => {
  const {editor} = await createInlineObjectTestEditor()

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: '[text](ur'})
  editor.send({
    type: 'insert.child',
    child: {_type: 'stock-ticker', _key: 'ticker0'},
  })
  editor.send({type: 'insert.text', text: 'l'})
  editor.send({type: 'insert.text', text: ')'})

  await vi.waitFor(() => {
    // The concatenated text reads `[text](url)`, but the inline object sits
    // inside the href, deleting the `](url)` region would destroy it, and
    // the captured href text would silently omit it, so the rule must not
    // fire.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: '[text](ur', marks: []},
          {_type: 'stock-ticker', _key: 'ticker0'},
          {_type: 'span', _key: 'k2', text: 'l)', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
