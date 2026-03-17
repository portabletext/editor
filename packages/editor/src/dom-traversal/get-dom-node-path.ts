import {deserializePath} from '../paths/deserialize-path'
import {isDOMElement, type DOMNode} from '../slate/dom/utils/dom'
import type {Path} from '../types/paths'

/**
 * Reads the closest `data-pt-path` attribute from a given DOM node and returns
 * the deserialized keyed path.
 */
export function getDomNodePath(domNode: DOMNode): Path | undefined {
  let element = isDOMElement(domNode) ? domNode : domNode.parentElement

  if (element && !element.hasAttribute('data-pt-path')) {
    element = element.closest('[data-pt-path]')
  }

  if (!element) {
    return undefined
  }

  const dataPath = element.getAttribute('data-pt-path')

  if (dataPath === null) {
    return undefined
  }

  if (dataPath === '') {
    return []
  }

  return deserializePath(dataPath)
}
