import {useEditor, type Editor} from '@portabletext/editor'
import {useEffect, type JSX, type ReactNode} from 'react'

declare global {
  interface Window {
    __pteLabEditor?: Editor
  }
}

interface PortableTextPluginsProps {
  renderDefault: (props: PortableTextPluginsProps) => JSX.Element
}

/**
 * Test-only instrumentation, mounted through the workspace config's
 * `form.components.portableText.plugins` slot (Studio renders it inside
 * the input's `EditorProvider`): parks the field's editor instance on
 * `window.__pteLabEditor` so the Playwright suite can drive selections
 * through the editor's own event API instead of synthesizing DOM
 * selections. Rendering is untouched (`renderDefault`).
 *
 * First registration wins and cleanup is identity-guarded, so a second
 * editor mounting inside the same page (Studio's comment composer is a
 * Portable Text editor too) can neither steal nor clear the handle.
 *
 * This works because the root `pnpm.overrides` pin
 * `sanity>@portabletext/editor` to the workspace package, so this
 * `useEditor` reads the same React context Studio's editor writes.
 */
export function TestEditorHandlePlugins(
  props: PortableTextPluginsProps,
): ReactNode {
  const editor = useEditor()

  useEffect(() => {
    if (window.__pteLabEditor !== undefined) {
      return
    }
    window.__pteLabEditor = editor

    return () => {
      if (window.__pteLabEditor === editor) {
        delete window.__pteLabEditor
      }
    }
  }, [editor])

  return props.renderDefault(props)
}
