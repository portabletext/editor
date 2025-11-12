import type {Editor} from 'slate'

const WITH_HISTORY = new WeakMap<Editor, boolean | undefined>()

export function isWithHistory(editor: Editor): boolean {
  const withHistory = WITH_HISTORY.get(editor)

  return withHistory ?? true
}

export function pluginWithoutHistory(editor: Editor, fn: () => void): void {
  const withHistory = isWithHistory(editor)

  WITH_HISTORY.set(editor, false)

  fn()

  WITH_HISTORY.set(editor, withHistory)
}

export function setWithHistory(editor: Editor, withHistory: boolean): void {
  WITH_HISTORY.set(editor, withHistory)
}
