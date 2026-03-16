import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import type {Node, NodeProps} from '../interfaces/node'

export function extractProps(node: Node, schema: EditorSchema): NodeProps {
  if (isTextBlock({schema}, node)) {
    const {children: _children, ...properties} = node

    return properties
  } else if (isSpan({schema}, node)) {
    const {text: _text, ...properties} = node

    return properties
  } else {
    return {...node}
  }
}
