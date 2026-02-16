import {createContext, useContext} from 'react'
import type {Editor} from '../../slate'

/**
 * A React context for sharing the editor object.
 */

export const EditorContext = createContext<Editor | null>(null)

/**
 * Get the current editor object from the React context.
 */

export const useSlateStatic = (): Editor => {
  const editor = useContext(EditorContext)

  if (!editor) {
    throw new Error(
      `The \`useSlateStatic\` hook must be used inside the <Slate> component's context.`,
    )
  }

  return editor
}
