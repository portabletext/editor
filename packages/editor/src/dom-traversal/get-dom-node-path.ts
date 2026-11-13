import {isDOMElement, type DOMNode} from '../engine/dom/utils/dom'
import type {Path} from '../engine/interfaces/path'
import {deserializePath} from '../paths/deserialize-path'

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

  const path = deserializePath(dataPath)
  const lastSegment = path.at(-1)
  if (
    element.getAttribute('data-pt-block') === 'object' &&
    typeof lastSegment === 'string' &&
    /^\d+$/.test(lastSegment)
  ) {
    // A keyless span at a block position has a path ending in its array index,
    // which `deserializePath` reads as a string.
    path[path.length - 1] = Number(lastSegment)
  }
  return path
}
