import type {PortableTextBlock} from '@portabletext/schema'
import React, {useCallback, useEffect} from 'react'
import {safeStringify} from '../../../internal-utils/safe-json'
import {isEditor} from '../../editor/is-editor'
import type {Editor, Selection} from '../../interfaces/editor'
import {
  SlateSelectorContext,
  useSelectorContext,
} from '../hooks/use-slate-selector'
import {EditorContext} from '../hooks/use-slate-static'

/**
 * A wrapper around the provider to handle `onChange` events, because the editor
 * is a mutable singleton so it won't ever register as "changed" otherwise.
 */

export const Slate = (props: {
  editor: Editor
  initialValue: PortableTextBlock[]
  children: React.ReactNode
  onChange?: (value: PortableTextBlock[]) => void
  onSelectionChange?: (selection: Selection) => void
  onValueChange?: (value: PortableTextBlock[]) => void
}) => {
  const {
    editor,
    children,
    onChange,
    onSelectionChange,
    onValueChange,
    initialValue,
    ...rest
  } = props

  // Run once on first mount, but before `useEffect` or render
  React.useState(() => {
    if (!isEditor(editor)) {
      throw new Error(
        `[Slate] editor is invalid! You passed: ${safeStringify(editor)}`,
      )
    }

    editor.children = initialValue
    Object.assign(editor, rest)
  })

  const {selectorContext, onChange: handleSelectorChange} = useSelectorContext()

  const onContextChange = useCallback(() => {
    if (onChange) {
      onChange(editor.children)
    }
    if (
      onSelectionChange &&
      editor.operations.find((op) => op.type === 'set_selection')
    ) {
      onSelectionChange(editor.selection)
    }
    if (
      onValueChange &&
      editor.operations.find((op) => op.type !== 'set_selection')
    ) {
      onValueChange(editor.children)
    }

    handleSelectorChange()
  }, [editor, handleSelectorChange, onChange, onSelectionChange, onValueChange])

  useEffect(() => {
    editor.onContextChange = onContextChange

    return () => {
      editor.onContextChange = () => {}
    }
  }, [editor, onContextChange])

  return (
    <SlateSelectorContext.Provider value={selectorContext}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </SlateSelectorContext.Provider>
  )
}
