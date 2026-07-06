import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {CharacterPairDecoratorPlugin} from './plugin.character-pair-decorator'

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
    children: (
      <CharacterPairDecoratorPlugin
        decorator={() => 'strong'}
        pair={{char: '*', amount: 2}}
      />
    ),
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}],
      inlineObjects: [{name: 'stock-ticker'}],
    }),
  })
}

test('Scenario: decorating a pair whose content spans an inline object', async () => {
  const {editor} = await createInlineObjectTestEditor()

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: '**bo'})
  editor.send({
    type: 'insert.child',
    child: {_type: 'stock-ticker', _key: 'ticker0'},
  })
  editor.send({type: 'insert.text', text: 'ld'})
  editor.send({type: 'insert.text', text: '**'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 'k4', text: 'bo', marks: ['strong']},
          {_type: 'stock-ticker', _key: 'ticker0'},
          {_type: 'span', _key: 'k2', text: 'ld', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: a pair whose prefix marker spans an inline object stays literal', async () => {
  const {editor} = await createInlineObjectTestEditor()

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  editor.send({type: 'insert.text', text: '*'})
  editor.send({
    type: 'insert.child',
    child: {_type: 'stock-ticker', _key: 'ticker0'},
  })
  editor.send({type: 'insert.text', text: '*bold'})
  editor.send({type: 'insert.text', text: '**'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: '*', marks: []},
          {_type: 'stock-ticker', _key: 'ticker0'},
          {_type: 'span', _key: 'k2', text: '*bold**', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
