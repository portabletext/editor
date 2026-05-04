import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('validate-selection-machine: action set across blocks', () => {
  test('Scenario: An action set that swaps a block keeps selection on the new block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()
    const newBlockKey = 'newBlock'
    const newSpanKey = 'newSpan'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.swap-image',
              actions: [
                () => [
                  execute({
                    type: 'insert.block',
                    block: {
                      _key: newBlockKey,
                      _type: 'block',
                      children: [
                        {_key: newSpanKey, _type: 'span', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    placement: 'after',
                    select: 'start',
                  }),
                  execute({
                    type: 'delete.block',
                    at: [{_key: imageKey}],
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.anchor.path).toEqual([
        {_key: imageKey},
      ])
    })

    editor.send({type: 'custom.swap-image'} as never)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: newBlockKey,
          _type: 'block',
          children: [{_key: newSpanKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      backward: false,
    })
  })
})
