import {useEditor} from '@portabletext/editor'
import {portableTextToMarkdown} from '@portabletext/markdown'
import {useEffect} from 'react'
import {pilcrowRenderers} from '../markdown'

/**
 * Listens for the platform save shortcut and exports the current document
 * to a markdown file.
 *
 * Cmd+S on Apple platforms, Ctrl+S elsewhere. The browser's native save
 * dialog is suppressed in favour of an in-page download triggered with
 * a temporary anchor element. The file name mirrors the running app for
 * now ('pilcrow.md'); a per-document name will follow once the header's
 * document-name field becomes editable.
 */
export function SaveOnHotkeyPlugin() {
  const editor = useEditor()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isSave =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 's'
      if (!isSave) {
        return
      }
      event.preventDefault()

      const value = editor.getSnapshot().context.value ?? []
      const markdown = portableTextToMarkdown(value, pilcrowRenderers)

      const blob = new Blob([markdown], {type: 'text/markdown;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'pilcrow.md'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [editor])

  return null
}
