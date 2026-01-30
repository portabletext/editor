import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.child.unset', () => {
  test('Scenario: Unsetting span marks', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: ['strong'],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['marks'],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [],
        },
      ])
    })
  })

  test('Scenario: Unsetting span _key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['_key'],
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k4',
        },
      ])
    })
  })

  test('Scenario: Unsetting span _type', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hell',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]
    const {editor, locator} = await createTestEditor({
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hell'])
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['_type'],
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'o')

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('Hell', 'Hello'))),
        },
      ])
    })
  })

  test('Scenario: Unsetting span text', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
      expect(patches).toEqual([])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['text'],
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('Hello', ''))),
        },
        // Unsetting the entire editor since it was made empty
        {
          origin: 'local',
          type: 'unset',
          path: [],
        },
      ])
    })
  })

  test('Scenario: Unsetting reserved properties on span', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hell',
            marks: ['strong'],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

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

    await userEvent.click(locator)
    await userEvent.type(locator, 'o')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('Hell', 'Hello'))),
        },
      ])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: ['_type', '_key', 'text', 'marks'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: '',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
      expect(patches.slice(1)).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: 'k4',
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}, 'marks'],
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('Hello', ''))),
        },
        // Unsetting the entire editor since it was made empty
        {
          origin: 'local',
          type: 'unset',
          path: [],
        },
        // Prepending a setIfMissing patch to ensure the editor is not empty
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [],
          value: [],
        },
        // This patch goes nowhere, but that's okay
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}, 'marks'],
          value: [],
        },
      ])
    })

    // Typing again to test the patch sequence when the editor goes from an
    // empty state to a non-empty state
    await userEvent.type(locator, 'f')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['f'])
      expect(patches.slice(7)).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [],
          value: [],
        },
        {
          origin: 'local',
          type: 'set',
          path: [],
          value: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  _key: 'k4',
                  text: '',
                  marks: [],
                },
              ],
              style: 'normal',
              markDefs: [],
            },
          ],
        },
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: 'k4'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'f'))),
        },
      ])
    })
  })

  test('Scenario: Unsetting properties on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
          {
            _type: 'image',
            _key: imageKey,
            url: 'https://www.sanity.io/logo.svg',
            alt: 'Sanity Logo',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([',{image},'])
    })

    editor.send({
      type: 'child.unset',
      at: [{_key: blockKey}, 'children', {_key: imageKey}],
      props: ['_type', '_key', 'alt'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {
              ...initialValue[0]!.children[0],
            },
            {
              // _type can't be unset
              _type: 'image',
              // unsetting _key will generate a new _key
              _key: 'k6',
              url: 'https://www.sanity.io/logo.svg',
            },
            {
              ...initialValue[0]!.children[2],
            },
          ],
        },
      ])
    })
  })
})
