import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {createTestEditor} from '../src/test/vitest'

describe('event.history.redo', () => {
  test('Scenario: Redo after remote patches', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'hello'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })

    const snapshotAfterRemote = [
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -0,0 +1,5 @@\n+world\n',
          origin: 'remote',
        },
      ],
      snapshot: snapshotAfterRemote,
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: world|')
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|world')
    })
  })

  test('Scenario: Simple redo without remote patches', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })
  })

  test('Scenario: Redoing a bold shortcut over part of a span restores the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[strong:^oob|]ar',
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'f', marks: []},
            {_type: 'span', _key: 'k5', text: 'oob', marks: ['strong']},
            {_type: 'span', _key: 'k4', text: 'ar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'k5'}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[strong:baz|]ar',
      )
    })
  })

  test('Scenario: Redoing removing bold from part of a bold span restores the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foobar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:f]^oob[strong:|ar]',
      )
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foobar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'f', marks: ['strong']},
            {_type: 'span', _key: 'k5', text: 'oob', marks: []},
            {_type: 'span', _key: 'k4', text: 'ar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'baz'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:f]baz|[strong:ar]',
      )
    })
  })
})
