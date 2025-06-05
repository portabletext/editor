import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelection} from '../types/editor'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

export function getSelectionText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  const startPoint = getSelectionStartPoint(selection)
  const endPoint = getSelectionEndPoint(selection)

  if (startPoint === undefined || endPoint === undefined) {
    return undefined
  }

  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const startChildKey = getChildKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
  const endChildKey = getChildKeyFromSelectionPoint(endPoint)

  const text: Array<string> = []

  for (const block of value) {
    if (text.length === 0 && startBlockKey !== block._key) {
      continue
    }

    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          if (startChildKey === child._key && endChildKey === child._key) {
            text.push(child.text.slice(startPoint.offset, endPoint.offset))
            break
          }

          if (startChildKey === child._key) {
            text.push(child.text.slice(startPoint.offset))
            continue
          }

          if (endChildKey === child._key) {
            text.push(child.text.slice(0, endPoint.offset))
            break
          }

          if (text.length > 0) {
            text.push(child.text)
          }
        }
      }
    } else {
      text.push(`[${block._type}]`)
    }

    if (endBlockKey === block._key) {
      break
    }
  }

  return text
}
