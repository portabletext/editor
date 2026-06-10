import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorEmittedEvent, MutationEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'
import {toTextspec} from '../test-utils/to-textspec'

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
              toTextspec({
                schema: compileSchema(defineSchema({})),
                value: event.value ?? [],
                selection: null,
              }) === 'B: foo bar'
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    expect(events.slice(0, 7)).toEqual([
      // Sync applies the valid first block (replacing the seed block `k5`,
      // with parse fix-ups for the missing `markDefs`/`style`), then stops
      // at the unknown block object.
      {
        type: 'operation',
        operation: {type: 'unset', path: [{_key: 'k5'}]},
      },
      {
        type: 'operation',
        operation: {
          type: 'insert',
          path: [0],
          position: 'before',
          node: {
            _key: 'k0',
            _type: 'block',
            children: [{_type: 'span', _key: 'k1', text: 'foo'}],
          },
        },
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
          value: [],
          inverse: {
            type: 'unset',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
          },
        },
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [{_key: 'k0'}, 'markDefs'],
          value: [],
          inverse: {type: 'unset', path: [{_key: 'k0'}, 'markDefs']},
        },
      },
      {
        type: 'operation',
        operation: {
          type: 'set',
          path: [{_key: 'k0'}, 'style'],
          value: 'normal',
          inverse: {type: 'unset', path: [{_key: 'k0'}, 'style']},
        },
      },
      {
        type: 'invalid value',
        resolution: {
          action: 'Remove the block',
          description: "Block with _key 'k2' has invalid _type 'image'",
          i18n: {
            action: 'inputs.portable-text.invalid-value.disallowed-type.action',
            description:
              'inputs.portable-text.invalid-value.disallowed-type.description',
            values: {key: 'k2', typeName: 'image'},
          },
          item: {_key: 'k2', _type: 'image'},
          patches: [{type: 'unset', path: [{_key: 'k2'}]}],
        },
        value: initialValue,
      },
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar|')
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
