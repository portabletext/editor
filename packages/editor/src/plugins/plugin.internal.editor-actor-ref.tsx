import React, {useContext} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {EditorActor} from '../editor/editor-machine'

export const InternalEditorAfterRefPlugin =
  React.forwardRef<EditorActor | null>((_, ref) => {
    const editorActor = useContext(EditorActorContext)

    const editorActorRef = React.useRef(editorActor)

    React.useImperativeHandle(ref, () => editorActorRef.current, [])

    return null
  })
InternalEditorAfterRefPlugin.displayName = 'InternalEditorAfterRefPlugin'
