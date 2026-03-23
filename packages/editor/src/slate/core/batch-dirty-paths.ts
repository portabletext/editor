// perf

import type {Editor} from '../interfaces/editor'

export const isBatchingDirtyPaths = (editor: Editor) => {
  return editor.batchingDirtyPaths
}

export const batchDirtyPaths = (
  editor: Editor,
  fn: () => void,
  update: () => void,
) => {
  const value = editor.batchingDirtyPaths
  editor.batchingDirtyPaths = true
  try {
    fn()
    update()
  } finally {
    editor.batchingDirtyPaths = value
  }
}
