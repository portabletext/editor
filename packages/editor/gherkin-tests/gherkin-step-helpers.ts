import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {KeyedSegment, PathSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelection, EditorSelectionPoint} from '../src'

/********************
 * Selection utility functions
 ********************/

export function selectionIsCollapsed(selection: EditorSelection) {
  if (!selection) {
    return false
  }

  return (
    selection.anchor.path.join() === selection.focus.path.join() &&
    selection.anchor.offset === selection.focus.offset
  )
}

function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}

export function getSelectionBlockKeys(selection: EditorSelection) {
  if (!selection) {
    return undefined
  }

  if (
    !isKeyedSegment(selection.anchor.path[0]) ||
    !isKeyedSegment(selection.focus.path[0])
  ) {
    return undefined
  }

  return {
    anchor: selection.anchor.path[0]._key,
    focus: selection.focus.path[0]._key,
  }
}

export function getSelectionFocusText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  let text: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      if (
        isKeyedSegment(selection.focus.path[0]) &&
        block._key === selection.focus.path[0]._key
      ) {
        for (const child of block.children) {
          if (isPortableTextSpan(child)) {
            if (
              isKeyedSegment(selection.focus.path[2]) &&
              child._key === selection.focus.path[2]._key
            ) {
              text = child.text
              break
            }
          }
        }
      }
    }
  }

  return text
}

export function getSelectionText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  const forwardSelection = selection.backward
    ? reverseTextSelection(selection)
    : selection

  if (!forwardSelection) {
    return undefined
  }

  const text: Array<string> = []

  for (const block of value) {
    if (
      text.length === 0 &&
      isKeyedSegment(forwardSelection.anchor.path[0]) &&
      block._key !== forwardSelection.anchor.path[0]._key
    ) {
      continue
    }

    if (text.length > 0) {
      text.push('|')
    }

    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          if (
            isKeyedSegment(forwardSelection.anchor.path[2]) &&
            child._key === forwardSelection.anchor.path[2]._key &&
            isKeyedSegment(forwardSelection.focus.path[2]) &&
            child._key === forwardSelection.focus.path[2]._key
          ) {
            text.push(
              child.text.slice(
                forwardSelection.anchor.offset,
                forwardSelection.focus.offset,
              ),
            )
            break
          }

          if (
            isKeyedSegment(forwardSelection.anchor.path[2]) &&
            child._key === forwardSelection.anchor.path[2]._key
          ) {
            text.push(child.text.slice(forwardSelection.anchor.offset))
            continue
          }

          if (
            isKeyedSegment(forwardSelection.focus.path[2]) &&
            child._key === forwardSelection.focus.path[2]._key
          ) {
            text.push(child.text.slice(0, forwardSelection.focus.offset))
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

    if (
      isKeyedSegment(forwardSelection.focus.path[0]) &&
      block._key === forwardSelection.focus.path[0]._key
    ) {
      break
    }
  }

  return text
}

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

export function getEditorSelection(
  blocks: Array<PortableTextBlock> | undefined,
): EditorSelection {
  if (!blocks) {
    throw new Error('No value found')
  }

  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined
  const firstBlock = blocks[0]
  const lastBlock = blocks[blocks.length - 1]

  if (isPortableTextBlock(firstBlock)) {
    anchor = {
      path: [
        {_key: firstBlock._key},
        'children',
        {_key: firstBlock.children[0]._key},
      ],
      offset: 0,
    }
  } else {
    anchor = {
      path: [{_key: firstBlock._key}],
      offset: 0,
    }
  }

  const lastChild = isPortableTextBlock(lastBlock)
    ? lastBlock.children[lastBlock.children.length - 1]
    : undefined
  if (
    isPortableTextBlock(lastBlock) &&
    lastChild &&
    isPortableTextSpan(lastChild)
  ) {
    focus = {
      path: [{_key: lastBlock._key}, 'children', {_key: lastChild._key}],
      offset: lastChild.text.length ?? 0,
    }
  } else {
    focus = {
      path: [{_key: lastBlock._key}],
      offset: 0,
    }
  }

  if (!anchor || !focus) {
    throw new Error('No selection found')
  }

  return {
    anchor,
    focus,
  }
}

export function getTextSelection(
  value: Array<PortableTextBlock> | undefined,
  text: string,
): EditorSelection {
  if (!value) {
    throw new Error(`Unable to find selection for value ${value}`)
  }

  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
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
    throw new Error(`Unable to find selection for text "${text}"`)
  }

  return {
    anchor,
    focus,
  }
}

export function getSelectionBeforeText(
  value: Array<PortableTextBlock> | undefined,
  text: string,
): EditorSelection {
  return collapseSelection(getTextSelection(value, text), 'start')
}

export function getSelectionAfterText(
  value: Array<PortableTextBlock> | undefined,
  text: string,
): EditorSelection {
  return collapseSelection(getTextSelection(value, text), 'end')
}

function collapseSelection(
  selection: EditorSelection,
  direction: 'start' | 'end',
): EditorSelection {
  if (!selection) {
    return selection
  }

  if (direction === 'start') {
    return selection.backward
      ? {
          anchor: selection.focus,
          focus: selection.focus,
          backward: false,
        }
      : {
          anchor: selection.anchor,
          focus: selection.anchor,
          backward: false,
        }
  }

  return selection.backward
    ? {
        anchor: selection.anchor,
        focus: selection.anchor,
        backward: false,
      }
    : {
        anchor: selection.focus,
        focus: selection.focus,
        backward: false,
      }
}

export function stringOverlap(x: string, y: string) {
  let overlap = ''

  const [string, searchString] = y.length >= x.length ? [x, y] : [y, x]

  for (let i = -1; i > -string.length + -searchString.length; i--) {
    if (i >= -string.length) {
      const stringSlice = string.slice(0, i * -1)
      const searchStringSlice = searchString.slice(i)

      if (stringSlice === searchStringSlice) {
        overlap = stringSlice.length > overlap.length ? stringSlice : overlap
      }
    } else {
      const searchStringSlice = searchString.slice(i, i + string.length)
      const stringSlice =
        searchStringSlice.length === string.length
          ? string
          : string.slice(string.length - searchStringSlice.length)

      if (stringSlice === searchStringSlice) {
        overlap = stringSlice.length > overlap.length ? stringSlice : overlap
      }
    }
  }

  return overlap
}

function splitString(string: string, searchString: string) {
  const searchStringIndex = string.indexOf(searchString)

  if (searchStringIndex === -1) {
    return [string, ''] as const
  }

  const firstPart = string.slice(0, searchStringIndex)
  const secondPart = string.slice(searchStringIndex + searchString.length)

  return [firstPart, secondPart] as const
}

export function reverseTextSelection(
  selection: EditorSelection,
): EditorSelection {
  if (!selection) {
    return selection
  }

  if (selection.backward) {
    return {
      anchor: selection.focus,
      focus: selection.anchor,
      backward: false,
    }
  }

  return {
    anchor: selection.focus,
    focus: selection.anchor,
    backward: true,
  }
}

/********************
 * Value utility functions
 ********************/

export function getValueText(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return undefined
  }

  const blocks: Array<string> = []

  for (const block of value) {
    if (blocks.length > 0) {
      blocks.push('|')
    }
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          blocks.push(child.text)
        } else {
          blocks.push(`[${child._type}]`)
        }
      }
    } else {
      blocks.push(`[${block._type}]`)
    }
  }

  return blocks
}

export function parseGherkinTextParameter(text: string) {
  return text
    .replace(/\|/g, ',|,')
    .split(',')
    .map((span) => span.replace(/\\n/g, '\n'))
}

export function getTextMarks(
  value: Array<PortableTextBlock> | undefined,
  text: string,
) {
  if (!value) {
    return undefined
  }

  let marks: Array<string> | undefined = undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.text === text) {
          marks = child.marks ?? []
          break
        }
      }
    }
  }

  return marks
}

export function getBlockKey(
  value: Array<PortableTextBlock> | undefined,
  text: string,
) {
  if (!value) {
    throw new Error(`Unable to find block key for text "${text}"`)
  }

  let blockKey: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.text === text) {
          blockKey = block._key
          break
        }
      }
    }
  }

  if (!blockKey) {
    throw new Error(`Unable to find block key for text "${text}"`)
  }

  return blockKey
}

export function getBlockKeys(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return []
  }

  return value.map((block) => block._key)
}

export function getAnnotations(
  value: Array<PortableTextBlock> | undefined,
): Array<string> {
  if (!value) {
    return []
  }

  const annotations: Array<string> = []

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.marks) {
          for (const mark of child.marks) {
            if (
              block.markDefs?.some((markDef) => markDef._key === mark) &&
              !annotations.includes(mark)
            ) {
              annotations.push(mark)
            }
          }
        }
      }
    }
  }

  return annotations
}
