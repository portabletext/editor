import {isDOMElement, type DOMNode} from '../slate/dom/utils/dom'
import type {KeyedSegment} from '../types/paths'
import {deserializePath} from './deserialize-path'

/**
 * Reads the closest `data-path` attribute from a given DOM node and returns
 * the deserialized keyed path.
 */
export function getDomNodePath(
  domNode: DOMNode,
): Array<KeyedSegment | string> | null {
  let element = isDOMElement(domNode) ? domNode : domNode.parentElement

  if (element && !element.hasAttribute('data-path')) {
    element = element.closest('[data-path]')
  }

  if (!element) {
    return null
  }

  const dataPath = element.getAttribute('data-path')

  if (dataPath === null) {
    return null
  }

  if (dataPath === '') {
    return []
  }

  return deserializePath(dataPath)
}
