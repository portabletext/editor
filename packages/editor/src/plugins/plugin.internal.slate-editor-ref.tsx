import React from 'react'
import {useSlateStatic} from 'slate-react'
import type {PortableTextSlateEditor} from '../types/editor'

export const InternalSlateEditorRefPlugin =
  React.forwardRef<PortableTextSlateEditor | null>((_, ref) => {
    const slateEditor = useSlateStatic()

    const slateEditorRef = React.useRef(slateEditor)

    React.useImperativeHandle(ref, () => slateEditorRef.current, [])

    return null
  })
InternalSlateEditorRefPlugin.displayName = 'InternalSlateEditorRefPlugin'
