import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../test/vitest'
import {AutoCloseBracketsPlugin} from './plugin.internal.auto-close-brackets'

describe(AutoCloseBracketsPlugin.name, () => {
  test('One-character text insertion', async () => {
    const {editor, locator} = await createTestEditor({
      children: <AutoCloseBracketsPlugin />,
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: '('})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['()'])
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['(foo)'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['()'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['('])
    })
  })

  test('Two-character text insertion', async () => {
    const {editor, locator} = await createTestEditor({
      children: <AutoCloseBracketsPlugin />,
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: '(f'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['(f)'])
    })

    await userEvent.type(locator, 'oo')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['(foo)'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['(f)'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['(f'])
    })
  })
})
