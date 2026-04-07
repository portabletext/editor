import {expect, vi} from 'vitest'
import type {Editor} from '../src/editor'
import type {EditorSelection} from '../src/types/editor'
import {getSelectionAfterText} from './text-selection'

export async function whenTheCaretIsPutAfter(
  editor: Editor,
  text: string,
): Promise<EditorSelection> {
  return await vi.waitFor(() => {
    const selection = getSelectionAfterText(editor.getSnapshot().context, text)

    editor.send({
      type: 'select',
      at: selection,
    })

    expect(editor.getSnapshot().context.selection).toEqual(selection)

    return selection
  })
}
