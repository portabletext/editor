import {useEffect, useState} from 'react'
import {createEditor} from 'slate'
import {withReact} from 'slate-react'
import {debugWithName} from '../../utils/debug'
import {KEY_TO_SLATE_ELEMENT, KEY_TO_VALUE_ELEMENT} from '../../utils/weakMaps'
import type {EditorActor} from '../editor-machine'
import {withPlugins} from '../plugins'

const debug = debugWithName('component:PortableTextEditor:SlateContainer')

export function useSlateEditor(config: {
  editorActor: EditorActor
  maxBlocks: number | undefined
  readOnly: boolean
}) {
  const {editorActor, readOnly, maxBlocks} = config

  // Create the slate instance, using `useState` ensures setup is only run once, initially
  const [[slateEditor, subscribe]] = useState(() => {
    debug('Creating new Slate editor instance')
    const {editor, subscribe: _sub} = withPlugins(withReact(createEditor()), {
      editorActor,
      maxBlocks,
      readOnly,
    })
    KEY_TO_VALUE_ELEMENT.set(editor, {})
    KEY_TO_SLATE_ELEMENT.set(editor, {})
    return [editor, _sub] as const
  })

  useEffect(() => {
    const unsubscribe = subscribe()
    return () => {
      unsubscribe()
    }
  }, [subscribe])

  // Update the slate instance when plugin dependent props change.
  useEffect(() => {
    debug('Re-initializing plugin chain')
    withPlugins(slateEditor, {
      editorActor,
      maxBlocks,
      readOnly,
    })
  }, [editorActor, maxBlocks, readOnly, slateEditor])

  useEffect(() => {
    return () => {
      debug('Destroying Slate editor')
      slateEditor.destroy()
    }
  }, [slateEditor])

  return slateEditor
}
