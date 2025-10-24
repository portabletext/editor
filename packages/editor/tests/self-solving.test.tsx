import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, it, test, vi} from 'vitest'
import type {
  EditorEmittedEvent,
  MutationEvent,
  PatchEvent,
} from '../src/editor/relay-machine'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('Feature: Self-solving', () => {
  it('Scenario: Missing .markDefs and .marks are added after the editor is made dirty', async () => {
    const schemaDefinition = defineSchema({decorators: [{name: 'strong'}]})
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
          },
        ],
        style: 'normal',
      },
    ]
    const spanPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      value: [],
      origin: 'local',
    }
    const blockPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}],
      value: {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
      origin: 'local',
    }
    const strongPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      value: ['strong'],
      origin: 'local',
    }
    const onEvent = vi.fn<(event: EditorEmittedEvent) => void>()
    const patchEvents: Array<PatchEvent> = []
    const mutationEvents: Array<MutationEvent> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            onEvent(event)

            if (event.type === 'patch') {
              patchEvents.push(event)
            }
            if (event.type === 'mutation') {
              mutationEvents.push(event)
            }
          }}
        />
      ),
      initialValue,
      keyGenerator,
      schemaDefinition,
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({
        type: 'ready',
      })
      expect(patchEvents).toEqual([])
      expect(mutationEvents).toEqual([])
    })

    editor.send({
      type: 'select',
      at: getTextSelection(
        {schema: compileSchema(schemaDefinition), value: initialValue},
        'foo',
      ),
    })
    editor.send({
      type: 'decorator.toggle',
      decorator: 'strong',
    })

    await vi.waitFor(() => {
      expect(patchEvents).toEqual([
        {type: 'patch', patch: spanPatch},
        {type: 'patch', patch: blockPatch},
        {type: 'patch', patch: strongPatch},
      ])
      expect(mutationEvents).toEqual([
        {
          type: 'mutation',
          patches: [spanPatch, blockPatch],
          snapshot: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
        {
          type: 'mutation',
          patches: [strongPatch],
          snapshot: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: spanKey,
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Child keys on inserted blocks are made unique', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const fooSpan = {
      _key: spanKey,
      _type: 'span',
      text: 'foo',
      marks: [],
    }
    const barSpan = {
      _key: spanKey,
      _type: 'span',
      text: 'bar',
      marks: ['strong'],
    }
    const block = {
      _key: blockKey,
      _type: 'block',
      children: [fooSpan, barSpan],
      style: 'normal',
      markDefs: [],
    }
    const initialValue = [block]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            fooSpan,
            {
              ...barSpan,
              _key: 'k4',
            },
          ],
        },
      ])

      expect(patches).toEqual([])
    })

    await userEvent.click(locator)

    const afterBarSelection = getSelectionAfterText(
      editor.getSnapshot().context,
      'bar',
    )

    editor.send({
      type: 'select',
      at: afterBarSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterBarSelection)
    })

    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo,barb'])

      expect(patches).toEqual([
        {
          origin: 'local',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          type: 'set',
          value: 'k4',
        },
        {
          origin: 'local',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}, 'text'],
          type: 'diffMatchPatch',
          value: stringifyPatches(makePatches(makeDiff('bar', 'barb'))),
        },
      ])
    })
  })

  test('Scenario: Inserted child keys are made unique', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const fooSpan = {
      _key: spanKey,
      _type: 'span',
      text: 'foo',
      marks: [],
    }
    const barSpan = {
      _key: spanKey,
      _type: 'span',
      text: 'bar',
      marks: ['strong'],
    }
    const block = {
      _key: blockKey,
      _type: 'block',
      children: [fooSpan],
      style: 'normal',
      markDefs: [],
    }
    const initialValue = [block]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block])
      expect(patches).toEqual([])
    })

    await userEvent.click(locator)

    const afterFooSelection = getSelectionAfterText(
      editor.getSnapshot().context,
      'foo',
    )

    editor.send({
      type: 'select',
      at: afterFooSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })

    editor.send({
      type: 'insert.child',
      child: barSpan,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            fooSpan,
            {
              ...barSpan,
              _key: 'k4',
            },
          ],
        },
      ])

      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: blockKey}, 'children', 0],
          position: 'after',
          items: [
            {
              ...barSpan,
              _key: 'k4',
            },
          ],
        },
      ])
    })
  })
})
