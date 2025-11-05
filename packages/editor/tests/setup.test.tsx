import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {
  EditorEmittedEvent,
  MutationEvent,
} from '../src/editor/relay-machine'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('Setup', () => {
  test('Scenario: Unknown block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
      },
      {
        _key: keyGenerator(),
        _type: 'image',
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_type: 'span', _key: keyGenerator(), text: 'bar'}],
      },
    ]
    const events: Array<EditorEmittedEvent> = []
    let mutationEvent: MutationEvent | undefined
    let resolveFooBarMutation: () => void
    const fooBarMutationPromise = new Promise<void>((resolve) => {
      resolveFooBarMutation = resolve
    })

    const {editor, locator} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)

            if (
              event.type === 'mutation' &&
              getTersePt({
                schema: compileSchema(defineSchema({})),
                value: event.value ?? [],
              }).at(0) === 'foo bar'
            ) {
              resolveFooBarMutation()
              mutationEvent = event
            }
          }}
        />
      ),
      initialValue,
      keyGenerator,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })

    expect(events.slice(0, 2)).toEqual([
      expect.objectContaining({
        type: 'invalid value',
      }),
      {type: 'ready'},
    ])

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'foo'),
      )
    })
    await userEvent.type(locator, ' bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar'])
    })

    await fooBarMutationPromise

    await vi.waitFor(() => {
      expect(mutationEvent).toEqual(
        expect.objectContaining({
          type: 'mutation',
          value: expect.arrayContaining([
            {
              _type: 'block',
              _key: expect.any(String),
              children: [
                {
                  _type: 'span',
                  _key: expect.any(String),
                  text: 'foo bar',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ]),
        }),
      )
    })
  })
})
