import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {whenTheCaretIsPutAfter} from '../test-utils/caret-placement'
import {toTextspec} from '../test-utils/to-textspec'

describe('event.move.block regression', () => {
  test('Scenario: Moving a block down preserves selection on the moved block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const bar = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const baz = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor, locator} = await createTestEditor({
      initialValue: [foo, bar, baz],
      keyGenerator,
    })

    await userEvent.click(locator)

    await whenTheCaretIsPutAfter(editor, 'foo')

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: bar', 'B: foo|', 'B: baz'].join('\n'),
      )
    })
  })

  test('Scenario: Moving a block up preserves selection on the moved block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const bar = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const baz = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor, locator} = await createTestEditor({
      initialValue: [foo, bar, baz],
      keyGenerator,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'baz')

    editor.send({
      type: 'move.block up',
      at: [{_key: baz._key}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: baz|', 'B: bar'].join('\n'),
      )
    })
  })

  test('Scenario: Undoing a move.block restores original order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const bar = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const baz = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      initialValue: [foo, bar, baz],
      keyGenerator,
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: bar', 'B: foo', 'B: baz'].join('\n'),
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz'].join('\n'),
      )
    })
  })

  test('Scenario: Moving block down and typing continues in the moved block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const foo = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const bar = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    const {editor, locator} = await createTestEditor({
      initialValue: [foo, bar],
      keyGenerator,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foo')

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: bar', 'B: foo|'].join('\n'),
      )
    })

    await userEvent.type(locator, 'baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: bar', 'B: foobaz|'].join('\n'),
      )
    })
  })
})
