import {diffMatchPatch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {ChangeEvent, Editor} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('event.apply', () => {
  test('Scenario: A collaborator’s text change emits one remote `change` and no correction', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })
    const changes = collectChanges(editor)
    const textPath = [{_key: blockKey}, 'children', {_key: spanKey}, 'text']

    editor.send({
      type: 'apply',
      patches: [diffMatchPatch('foo', 'fool', textPath)],
    })

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'fool'),
    ])
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'insert.text',
            path: textPath.slice(0, 3),
            offset: 3,
            text: 'l',
          },
        ],
      },
    ])
  })

  test('Scenario: An `apply` with no patches emits no `change` and keeps the value and undo stack', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block(blockKey, spanKey, 'foo')],
    })

    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const end = {path: spanPath, offset: 3}

    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: end, focus: end}})
    editor.send({type: 'insert.text', text: 'x'})
    const changes = collectChanges(editor)

    editor.send({type: 'apply', patches: []})

    expect(changes).toEqual([])
    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foox'),
    ])

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      block(blockKey, spanKey, 'foo'),
    ])
  })
})

function collectChanges(editor: Editor): Array<ChangeEvent> {
  const changes: Array<ChangeEvent> = []
  editor.on('change', (event) => {
    changes.push(event)
  })
  return changes
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}
