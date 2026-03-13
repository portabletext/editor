import type {EditorSchema} from '../../editor/editor-schema'
import {isAncestorElement} from '../element/is-ancestor-element'
import type {Node, NodeProps, ObjectNode} from '../interfaces/node'
import {isText} from '../text/is-text'

export function extractProps(node: Node, schema: EditorSchema): NodeProps {
  if (isAncestorElement(node, schema)) {
    const {children: _children, ...properties} = node

    return properties
  } else if (isText(node, schema)) {
    const {text: _text, ...properties} = node

    return properties
  } else {
    return {...(node as ObjectNode)}
  }
}
