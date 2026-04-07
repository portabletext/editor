import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {whenTheCaretIsPutAfter} from '../test-utils/caret-placement'

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

    const afterFooSelection = await whenTheCaretIsPutAfter(editor, 'foo')

    editor.send({
      type: 'move.block down',
      at: [{_key: foo._key}],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'bar',
        'foo',
        'baz',
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
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
    const afterBazSelection = await whenTheCaretIsPutAfter(editor, 'baz')

    editor.send({
      type: 'move.block up',
      at: [{_key: baz._key}],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'baz',
        'bar',
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterBazSelection)
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'bar',
        'foo',
        'baz',
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo',
        'bar',
        'baz',
      ])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar', 'foo'])
    })

    await userEvent.type(locator, 'baz')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'bar',
        'foobaz',
      ])
    })
  })
})
