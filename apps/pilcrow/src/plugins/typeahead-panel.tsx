import {useEditor} from '@portabletext/editor'
import type {ReactNode} from 'react'
import {useEffect, useRef} from 'react'

/**
 * Floating typeahead panel anchored to the caret rect. Used by the
 * slash menu and emoji picker. The panel positions itself below the
 * caret on every render where matches/selection changes, and renders
 * either an empty-state message or a list-box of consumer-rendered
 * items.
 */
export function TypeaheadPanel(props: {
  /** Whether to render at all. */
  active: boolean
  /** Trigger text used in the empty-state message. */
  emptyHint?: string
  children?: ReactNode
}) {
  const editor = useEditor()
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!props.active || !anchorRef.current) {
      return
    }
    const rect = editor.dom.getSelectionRect(editor.getSnapshot())
    if (!rect) {
      return
    }
    const el = anchorRef.current
    el.style.top = `${window.scrollY + rect.bottom + 4}px`
    el.style.left = `${window.scrollX + rect.left}px`
  })

  if (!props.active) {
    return null
  }

  return (
    <div ref={anchorRef} className="pc-typeahead-panel" role="listbox">
      {props.children}
    </div>
  )
}
