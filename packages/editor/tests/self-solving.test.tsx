import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
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
  test('Scenario: Missing .markDefs and .marks are added after the editor is made dirty', async () => {
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
    const blockPatch: Patch = {
      type: 'set',
      path: [{_key: blockKey}, 'markDefs'],
      value: [],
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

    // toSlateBlock guarantees marks: [] on all spans, so no marks
    // normalization patch is emitted. Only markDefs and strong patches.
    await vi.waitFor(() => {
      expect(patchEvents).toEqual([
        {type: 'patch', patch: blockPatch},
        {type: 'patch', patch: strongPatch},
      ])
      expect(mutationEvents).toEqual([
        {
          type: 'mutation',
          patches: [blockPatch],
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

  test('Scenario: Missing .style is added after the editor is made dirty', async () => {
    const patches: Array<Patch> = []
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
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ]

    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue,
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

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(patches).toEqual([])
    })

    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'normal',
        },
        {
          origin: 'local',
          type: 'unset',
          path: [],
        },
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              ...initialValue[0],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'f'))),
        },
      ])
    })
  })

  test('Scenario: Missing .style is added to inserted block', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [],
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

    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    editor.send({
      type: 'insert.block',
      at: {
        anchor: {
          path: [{_key: 'k0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}],
          offset: 0,
        },
      },
      block: {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
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
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          items: [
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
              markDefs: [],
            },
          ],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'normal',
        },
      ])
    })
  })

  test('Scenario: Child keys on initial blocks are made unique', async () => {
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
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'children'],
          value: [],
        },
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

  test('Scenario: Initial block _keys are made unique', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const fooSpan = {
      _key: fooKey,
      _type: 'span',
      text: 'foo',
      marks: [],
    }
    const barKey = keyGenerator()
    const barSpan = {
      _key: barKey,
      _type: 'span',
      text: 'bar',
      marks: [],
    }
    const block0 = {
      _key: blockKey,
      _type: 'block',
      children: [fooSpan],
      style: 'normal',
      markDefs: [],
    }
    const block1 = {
      _key: blockKey,
      _type: 'block',
      children: [barSpan],
      style: 'normal',
      markDefs: [],
    }
    const image = {
      _key: blockKey,
      _type: 'image',
    }
    const initialValue = [block0, block1, image]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
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
        block0,
        {...block1, _key: 'k5'},
        {...image, _key: 'k6'},
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
      expect(editor.getSnapshot().context.value).toEqual([
        block0,
        {
          ...block1,
          _key: 'k5',
          children: [
            {
              ...barSpan,
              text: 'barb',
            },
          ],
        },
        {
          ...image,
          _key: 'k6',
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [1, '_key'],
          value: 'k5',
        },
        {
          origin: 'local',
          type: 'set',
          path: [2, '_key'],
          value: 'k6',
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: 'k5'}, 'children', {_key: 'k2'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('bar', 'barb'))),
        },
      ])
    })
  })

  test('Scenario: Inserted block _keys are made unique', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const fooSpan = {
      _key: fooKey,
      _type: 'span',
      text: 'foo',
      marks: [],
    }
    const barKey = keyGenerator()
    const barSpan = {
      _key: barKey,
      _type: 'span',
      text: 'bar',
      marks: [],
    }
    const block = {
      _key: blockKey,
      _type: 'block',
      children: [fooSpan],
      style: 'normal',
      markDefs: [],
    }
    const initialValue = [block]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
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

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: blockKey,
        children: [barSpan],
        style: 'normal',
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        block,
        {
          _type: 'block',
          _key: 'k5',
          children: [barSpan],
          style: 'normal',
          markDefs: [],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k5',
              children: [barSpan],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: 'k5'}, 'markDefs'],
          value: [],
        },
      ])
    })
  })
})
