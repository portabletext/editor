import {
  applyAll,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {effect, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EventListenerPlugin} from '../src/plugins'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event.delete.forward', () => {
  test('Scenario: Deleting lonely block object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'foo', type: 'string'}]},
        blockObjects: [{name: 'image'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(foreignValue).toEqual([])

      expect(patches).toEqual([unset([{_key: imageKey}])])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: 'k3'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
          foo: 'bar',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches.slice(1)).toEqual([
        setIfMissing([], []),
        set(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        set('bar', [{_key: 'k3'}, 'foo']),
      ])
    })
  })

  test('Scenario: Merging two text blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const block2Key = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const behaviorEvents: Array<BehaviorEvent> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: block1Key,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: block2Key,
          _type: 'block',
          children: [
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
            {_key: bazSpanKey, _type: 'span', text: 'baz', marks: [linkKey]},
          ],
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://example.com',
            },
          ],
        },
      ],
      children: (
        <>
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: '*',
                actions: [
                  ({event}) => [
                    effect(() => {
                      behaviorEvents.push(event)
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: block1Key,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: ['strong']},
            {_key: bazSpanKey, _type: 'span', text: 'baz', marks: [linkKey]},
          ],
          style: 'normal',
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://example.com',
            },
          ],
        },
      ])
    })

    await vi.waitFor(() => {
      expect(
        behaviorEvents.some(
          (behaviorEvent) => behaviorEvent.type === 'delete.block',
        ),
      ).toBe(true)
      expect(
        behaviorEvents.some(
          (behaviorEvent) => behaviorEvent.type === 'insert.block',
        ),
      ).toBe(true)
    })
  })
})
