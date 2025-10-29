import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorSnapshot} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('EditorSnapshot', () => {
  test('Scenario: A new snapshot is captured for each action set', async () => {
    const inspectSelection =
      vi.fn<(selection: EditorSnapshot['context']['selection']) => void>()
    const inspectValue =
      vi.fn<(value: EditorSnapshot['context']['value']) => void>()

    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({snapshot}) => {
                  inspectSelection(snapshot.context.selection)
                  inspectValue(snapshot.context.value)
                  return [
                    execute({
                      type: 'insert.text',
                      text: 'b',
                    }),
                  ]
                },
                ({snapshot}) => {
                  inspectSelection(snapshot.context.selection)
                  inspectValue(snapshot.context.value)
                  return [
                    execute({
                      type: 'insert.text',
                      text: 'c',
                    }),
                  ]
                },
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    expect(inspectSelection).toHaveBeenNthCalledWith(1, {
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
      backward: false,
    })
    expect(inspectValue).toHaveBeenNthCalledWith(1, [
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(inspectSelection).toHaveBeenNthCalledWith(2, {
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      },
      backward: false,
    })
    expect(inspectValue).toHaveBeenNthCalledWith(2, [
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', marks: [], text: 'b'}],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(inspectSelection).not.toHaveBeenCalledTimes(3)
    expect(inspectValue).not.toHaveBeenCalledTimes(3)
  })
})
