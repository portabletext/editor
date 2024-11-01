import {useEffect, useMemo, useState, type PropsWithChildren} from 'react'
import {createEditor} from 'slate'
import {Slate, withReact} from 'slate-react'
import {debugWithName} from '../../utils/debug'
import {KEY_TO_SLATE_ELEMENT, KEY_TO_VALUE_ELEMENT} from '../../utils/weakMaps'
import type {EditorActor} from '../editor-machine'
import {withPlugins} from '../plugins'
import type {PortableTextEditor} from '../PortableTextEditor'

const debug = debugWithName('component:PortableTextEditor:SlateContainer')

/**
 * @internal
 */
export interface SlateContainerProps extends PropsWithChildren {
  editorActor: EditorActor
  maxBlocks: number | undefined
  portableTextEditor: PortableTextEditor
  readOnly: boolean
}

/**
 * Sets up and encapsulates the Slate instance
 * @internal
 */
export function SlateContainer(props: SlateContainerProps) {
  const {editorActor, portableTextEditor, readOnly, maxBlocks} = props

  // Create the slate instance, using `useState` ensures setup is only run once, initially
  const [[slateEditor, subscribe]] = useState(() => {
    debug('Creating new Slate editor instance')
    const {editor, subscribe: _sub} = withPlugins(withReact(createEditor()), {
      editorActor,
      maxBlocks,
      portableTextEditor,
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
      portableTextEditor,
      readOnly,
    })
  }, [editorActor, portableTextEditor, maxBlocks, readOnly, slateEditor])

  const initialValue = useMemo(() => {
    return [slateEditor.pteCreateTextBlock({decorators: []})]
  }, [slateEditor])

  useEffect(() => {
    return () => {
      debug('Destroying Slate editor')
      slateEditor.destroy()
    }
  }, [slateEditor])

  return (
    <Slate editor={slateEditor} initialValue={initialValue}>
      {props.children}
    </Slate>
  )
}

SlateContainer.displayName = 'SlateContainer'
