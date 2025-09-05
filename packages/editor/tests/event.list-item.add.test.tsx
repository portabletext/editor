import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'

describe('event.list item.add', () => {
  test('Scenario: Adding initial level', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'Hello', marks: []},
      ],
      style: 'normal',
      markDefs: [],
    }
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
      initialValue: [block],
    })

    editor.send({type: 'focus'})

    editor.send({
      type: 'list item.add',
      listItem: 'bullet',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block,
        level: 1,
        listItem: 'bullet',
      },
    ])
  })

  test('Scenario: Preserving existing level', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'Hello', marks: []},
      ],
      level: 2,
      listItem: 'bullet',
      style: 'normal',
      markDefs: [],
    }
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}, {name: 'number'}],
      }),
      initialValue: [block],
    })

    editor.send({type: 'focus'})

    editor.send({
      type: 'list item.add',
      listItem: 'number',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...block,
        level: 2,
        listItem: 'number',
      },
    ])
  })

  test('Scenario: Aborting if list type is unknown', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'Hello', marks: []},
      ],
      style: 'normal',
      markDefs: [],
    }
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
      initialValue: [block],
    })

    editor.send({type: 'focus'})

    editor.send({
      type: 'list item.add',
      listItem: 'number',
    })

    expect(editor.getSnapshot().context.value).toEqual([block])
  })
})
