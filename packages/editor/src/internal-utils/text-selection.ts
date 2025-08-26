import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {collapseSelection} from './collapse-selection'
import {splitString} from './split-string'
import {stringOverlap} from './string-overlap'

export function getTextSelection(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
): EditorSelection {
  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined

  for (const block of context.value) {
    if (isTextBlock(context, block)) {
      for (const child of block.children) {
        if (isSpan(context, child)) {
          if (child.text === text) {
            anchor = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: 0,
            }
            focus = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: text.length,
            }
            break
          }

          const splitChildText = splitString(child.text, text)

          if (splitChildText[0] === '' && splitChildText[1] !== '') {
            anchor = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: 0,
            }
            focus = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: text.length,
            }
            break
          }

          if (
            splitChildText[0] !== '' &&
            splitChildText[1] === '' &&
            child.text.indexOf(text) !== -1
          ) {
            anchor = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: child.text.length - text.length,
            }
            focus = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: child.text.length,
            }
            break
          }

          if (splitChildText[0] !== '' && splitChildText[1] !== '') {
            anchor = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: splitChildText[0].length,
            }
            focus = {
              path: [{_key: block._key}, 'children', {_key: child._key}],
              offset: splitChildText[0].length + text.length,
            }
            break
          }

          const overlap = stringOverlap(child.text, text)

          if (overlap !== '') {
            if (child.text.lastIndexOf(overlap) >= 0 && !anchor) {
              anchor = {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: child.text.lastIndexOf(overlap),
              }
              continue
            }

            if (child.text.indexOf(overlap) === 0) {
              focus = {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: overlap.length,
              }
            }
          }
        }
      }
    }
  }

  if (!anchor || !focus) {
    throw new Error(
      `Unable to find selection for text "${text}" in value "${JSON.stringify(context.value)}"`,
    )
  }

  return {
    anchor,
    focus,
  }
}

export function getSelectionBeforeText(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
): EditorSelection {
  return collapseSelection(getTextSelection(context, text), 'start')
}

export function getSelectionAfterText(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
): EditorSelection {
  return collapseSelection(getTextSelection(context, text), 'end')
}
