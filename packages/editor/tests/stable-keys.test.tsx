import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {getActiveDecorators} from '../src/selectors/selector.get-active-decorators'
import {createTestEditor} from '../src/test/vitest'

describe('Feature: Stable keys', () => {
  test('Scenario: Typing after annotation', async () => {
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo ', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: [linkKey]},
            {_type: 'span', _key: bazKey, text: 'new baz', marks: []},
          ],
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Typing with activated decorator at end of unmarked span absorbs into next matching span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const helloKey = keyGenerator()
    const worldKey = keyGenerator()

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
            {_type: 'span', _key: helloKey, text: 'hello', marks: []},
            {_type: 'span', _key: worldKey, text: ' world', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // When the editor is focused
    await userEvent.click(locator)

    // And the caret is put at the end of "hello"
    const endOfHelloSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: helloKey}],
        offset: 5,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: helloKey}],
        offset: 5,
      },
      backward: false,
    }
    editor.send({
      type: 'select',
      at: endOfHelloSelection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        endOfHelloSelection,
      )
    })

    // And "strong" is activated
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })

    // And "x" is typed
    await userEvent.keyboard('x')

    // Then the next span absorbs the new character and keeps its key
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: helloKey, text: 'hello', marks: []},
            {_type: 'span', _key: worldKey, text: 'x world', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
