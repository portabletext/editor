import React from 'react'
import {useEngineStatic} from '../engine/react/hooks/use-engine-static'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export const InternalEditorEngineRefPlugin =
  React.forwardRef<PortableTextEditorEngine | null>((_, ref) => {
    const editorEngine = useEngineStatic()

    const editorEngineRef = React.useRef(editorEngine)

    React.useImperativeHandle(ref, () => editorEngineRef.current, [])

    return null
  })
InternalEditorEngineRefPlugin.displayName = 'InternalEditorEngineRefPlugin'
