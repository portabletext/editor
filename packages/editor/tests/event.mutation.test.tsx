import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorEmittedEvent, MutationEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.mutation', () => {
  test('Scenario: Deferring mutation events when read-only', async () => {
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()

    const {editor, locator} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
    })

    await userEvent.type(locator, 'foo')

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )

    await userEvent.type(locator, 'bar')

    editor.send({type: 'update readOnly', readOnly: true})

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )

    editor.send({type: 'update readOnly', readOnly: false})

    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mutation',
        value: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }),
    )
  })

  test('Scenario: Batching typing mutations', async () => {
    const mutations: Array<MutationEvent> = []

    const {locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      ),
    })

    await userEvent.type(locator, 'foo')
    await new Promise((resolve) => setTimeout(resolve, 250))
    await userEvent.type(locator, 'bar')
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(mutations).toHaveLength(2)
    expect(mutations[0].value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(mutations[1].value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
