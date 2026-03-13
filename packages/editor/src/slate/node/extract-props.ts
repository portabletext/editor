import type {EditorSchema} from '../../editor/editor-schema'
import {Element} from '../interfaces/element'
import type {Node, NodeProps, ObjectNode} from '../interfaces/node'
import {Text} from '../interfaces/text'

export function extractProps(node: Node, schema: EditorSchema): NodeProps {
  if (Element.isAncestor(node, schema)) {
    const {children: _children, ...properties} = node

    return properties
  } else if (Text.isText(node, schema)) {
    const {text: _text, ...properties} = node

    return properties
  } else {
    return {...(node as ObjectNode)}
  }
}
