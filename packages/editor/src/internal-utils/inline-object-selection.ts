import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '../types/editor'

export function getInlineObjectSelection(
  value: Array<PortableTextBlock> | undefined,
  inlineObjectName: string,
) {
  if (!value) {
    throw new Error(`Unable to find selection for value ${value}`)
  }

  let selection: EditorSelection = null

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (child._type === inlineObjectName) {
          selection = {
            anchor: {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: 0,
            },
          }

          break
        }
      }
    }
  }

  return selection
}

export function getSelectionAfterInlineObject(
  value: Array<PortableTextBlock> | undefined,
  inlineObjectName: string,
) {
  if (!value) {
    throw new Error(`Unable to find selection for value ${value}`)
  }

  let inlineObjectFound = false
  let selection: EditorSelection = null

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          if (inlineObjectFound) {
            selection = {
              anchor: {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: 0,
              },
              focus: {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: 0,
              },
            }
            break
          }
        }

        if (child._type === inlineObjectName) {
          inlineObjectFound = true
        }
      }
    }
  }

  return selection
}

export function getSelectionBeforeInlineObject(
  value: Array<PortableTextBlock> | undefined,
  inlineObjectName: string,
) {
  if (!value) {
    throw new Error(`Unable to find selection for value ${value}`)
  }

  let selection: EditorSelection = null
  let prevSpanSelection: EditorSelection = null

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          prevSpanSelection = {
            anchor: {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: child.text.length,
            },
            focus: {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: child.text.length,
            },
          }
        }

        if (child._type === inlineObjectName) {
          selection = prevSpanSelection
          break
        }
      }
    }
  }

  return selection
}
