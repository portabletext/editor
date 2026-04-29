import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {toTextspec} from '../../test-utils/to-textspec'
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (|)')
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (foo|)')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (|)')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (|')
    })
  })

  test('Two-character text insertion', async () => {
    const {editor, locator} = await createTestEditor({
      children: <AutoCloseBracketsPlugin />,
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: '(f'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (f|)')
    })

    await userEvent.type(locator, 'oo')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (foo|)')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (f|)')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: (f|')
    })
  })
})
