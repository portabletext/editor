import React from 'react'
import {usePortableTextEditor} from '../editor/hooks/usePortableTextEditor'
import type {PortableTextEditor} from '../editor/PortableTextEditor'

export const InternalPortableTextEditorRefPlugin =
  React.forwardRef<PortableTextEditor | null>((_, ref) => {
    const portableTextEditor = usePortableTextEditor()

    const portableTextEditorRef = React.useRef(portableTextEditor)

    React.useImperativeHandle(ref, () => portableTextEditorRef.current, [])

    return null
  })
InternalPortableTextEditorRefPlugin.displayName =
  'InternalPortableTextEditorRefPlugin'
