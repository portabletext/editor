import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('Feature: Normalize caret placement', () => {
  test('Scenario: Typing before a decorated span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()

    // Given the editor state "B: foo [strong:bar] baz"
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // When the editor is focused
    await userEvent.click(locator)

    // And the caret is put after "foo "
    const afterFooSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: fooKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: fooKey}],
        offset: 4,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: afterFooSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })

    // And "new" is typed
    await userEvent.keyboard('new')

    // Then the text is "foo new,bar, baz"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo new,bar, baz',
      ])
    })

    // And the caret is after "foo new"
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 7,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 7,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Typing after a decorated span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: bazKey, text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // When the editor is focused
    await userEvent.click(locator)

    // And the caret is put before " baz"
    const beforeBazSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: bazKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: bazKey}],
        offset: 0,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: beforeBazSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(beforeBazSelection)
    })

    // And "new" is typed
    await userEvent.keyboard('new')

    // Then the text is "foo ,barnew, baz"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,barnew, baz',
      ])
    })

    // And the caret is before " baz"
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(beforeBazSelection)
    })
  })

  test('Scenario: Typing before an annotated span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: [linkKey]},
            {_type: 'span', _key: bazKey, text: ' baz', marks: []},
          ],
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
          ],
          style: 'normal',
        },
      ],
    })

    // When the editor is focused
    await userEvent.click(locator)

    // And the caret is put after "foo "
    const afterFooSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: fooKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: fooKey}],
        offset: 4,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: afterFooSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })

    // And "new" is typed
    await userEvent.keyboard('new')

    // Then the text is "foo new,bar, baz"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo new,bar, baz',
      ])
    })

    // And the caret is after "foo new"
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 7,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 7,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Typing after an annotated span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: [linkKey]},
            {_type: 'span', _key: bazKey, text: ' baz', marks: []},
          ],
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
          ],
          style: 'normal',
        },
      ],
    })

    // When the editor is focused
    await userEvent.click(locator)

    // And the caret is put before " baz"
    const beforeBazSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: bazKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: bazKey}],
        offset: 0,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: beforeBazSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(beforeBazSelection)
    })

    // And "new" is typed
    await userEvent.keyboard('new')

    // Then the text is "foo ,bar,new baz"
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,bar,new baz',
      ])
    })

    // And the caret is before " baz"
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
        backward: false,
      })
    })
  })
})
