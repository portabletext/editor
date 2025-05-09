import React from 'react'
import {EditorContext} from './editor-context'

/**
 * @public
 * Get the current editor context from the `EditorProvider`.
 * Must be used inside the `EditorProvider` component.
 * @returns The current editor object.
 * @example
 * ```tsx
 * import { useEditor } from '@portabletext/editor'
 *
 * function MyComponent() {
 *  const editor = useEditor()
 * }
 * ```
 * @group Hooks
 */
export function useEditor() {
  const editor = React.useContext(EditorContext)

  if (!editor) {
    throw new Error('No Editor set. Use EditorProvider to set one.')
  }

  return editor
}
