import {createContext, useContext} from 'react'
import type {PortableTextEditor} from '../PortableTextEditor'

/**
 * A React context for sharing the editor object.
 */
export const PortableTextEditorContext =
  createContext<PortableTextEditor | null>(null)

/**
 * @deprecated Use `useEditor` to get the current editor instance.
 * @public
 * Get the current editor object from the React context.
 */
export const usePortableTextEditor = (): PortableTextEditor => {
  const editor = useContext(PortableTextEditorContext)

  if (!editor) {
    throw new Error(
      `The \`usePortableTextEditor\` hook must be used inside the <PortableTextEditor> component's context.`,
    )
  }

  return editor
}
