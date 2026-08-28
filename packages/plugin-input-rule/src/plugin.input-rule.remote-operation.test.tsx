import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {InputRulePlugin} from './plugin.input-rule'
import {defineTextTransformRule} from './text-transform-rule'

const arrowRule = defineTextTransformRule({
  on: /->$/,
  transform: () => '→',
})

test("Scenario: a remote collaborator's edit to another block does not disarm smart undo", async () => {
  const keyGenerator = createTestKeyGenerator()
  const ruleBlockKey = keyGenerator()
  const ruleSpanKey = keyGenerator()
  const otherBlockKey = keyGenerator()
  const otherSpanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: ruleBlockKey,
        children: [{_type: 'span', _key: ruleSpanKey, text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: otherBlockKey,
        children: [{_type: 'span', _key: otherSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: <InputRulePlugin rules={[arrowRule]} />,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: ruleBlockKey}, 'children', {_key: ruleSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: ruleBlockKey}, 'children', {_key: ruleSpanKey}],
        offset: 0,
      },
    },
  })
  // Typed as separate events, the way real typing arrives: the trigger
  // character must already be in the document when the rule's own match
  // fires.
  editor.send({type: 'insert.text', text: '-'})
  editor.send({type: 'insert.text', text: '>'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: ruleBlockKey,
        children: [{_type: 'span', _key: ruleSpanKey, text: '→', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: otherBlockKey,
        children: [{_type: 'span', _key: otherSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'set',
        path: [{_key: otherBlockKey}, 'children', {_key: otherSpanKey}, 'text'],
        value: 'baz',
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: ruleBlockKey,
        children: [{_type: 'span', _key: ruleSpanKey, text: '→', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: otherBlockKey,
        children: [{_type: 'span', _key: otherSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({type: 'delete.backward', unit: 'character'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: ruleBlockKey,
        children: [{_type: 'span', _key: ruleSpanKey, text: '->', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: otherBlockKey,
        children: [{_type: 'span', _key: otherSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
