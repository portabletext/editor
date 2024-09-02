import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import {type PortableTextBlock} from '@sanity/types'

import {type EditorSelection, type EditorSelectionPoint} from '../../src'
import {type Editor} from '../setup/globals.jest'

/********************
 * Step helpers
 ********************/

export async function getEditorBlockKey(editor: Editor, text: string) {
  return editor.getValue().then((value) => getBlockKey(value, text))
}

export function getEditorText(editor: Editor) {
  return editor.getValue().then(getText)
}

export async function insertEditorText(editor: Editor, text: string) {
  await editor.insertText(text)
  const value = await editor.getValue()

  return getBlockKey(value, text)
}

export async function insertBlockObject(editor: Editor, name: 'image') {
  return getNewBlockKeys(editor, async () => {
    await editor.pressButton(`insert-${name}`)
  })
}

export function getText(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return undefined
  }

  const text: Array<string> = []

  for (const block of value) {
    if (text.length > 0) {
      text.push('\n')
    }
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          text.push(child.text)
        } else {
          text.push(child._type)
        }
      }
    } else {
      text.push(block._type)
    }
  }

  return text
}

export function getEditorTextMarks(editor: Editor, text: string) {
  return editor.getValue().then((value) => getTextMarks(value, text))
}

export function getTextMarks(value: Array<PortableTextBlock> | undefined, text: string) {
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

export function toggleAnnotation(editor: Editor, annotation: 'comment' | 'link') {
  return getNewAnnotations(editor, async () => {
    await editor.toggleAnnotation(annotation)
  })
}

export function selectEditorInlineObject(editor: Editor, inlineObjectName: string) {
  return editor
    .getValue()
    .then((value) => getInlineObjectSelection(value, inlineObjectName))
    .then(editor.setSelection)
}

export function selectBeforeEditorInlineObject(editor: Editor, inlineObjectName: string) {
  return selectEditorInlineObject(editor, inlineObjectName).then(() => editor.pressKey('ArrowLeft'))
}

export function selectAfterEditorInlineObject(editor: Editor, inlineObjectName: string) {
  return selectEditorInlineObject(editor, inlineObjectName).then(() =>
    editor.pressKey('ArrowRight'),
  )
}

export function selectEditorText(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(editor.setSelection)
}

export function selectEditorTextBackwards(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(reverseTextSelection)
    .then(editor.setSelection)
}

export function selectBeforeEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() => editor.pressKey('ArrowLeft'))
}

export function selectAfterEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() => editor.pressKey('ArrowRight'))
}

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
      if (block._key === selection.focus.path[0]['_key']) {
        for (const child of block.children) {
          if (isPortableTextSpan(child)) {
            if (child._key === selection.focus.path[2]['_key']) {
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

  const forwardSelection = selection.backward ? reverseTextSelection(selection) : selection

  if (!forwardSelection) {
    return undefined
  }

  const text: Array<string> = []

  for (const block of value) {
    if (text.length === 0 && block._key !== forwardSelection.anchor.path[0]['_key']) {
      continue
    }

    if (text.length > 0) {
      text.push('\n')
    }

    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          if (child._key === forwardSelection.anchor.path[2]['_key']) {
            text.push(child.text.slice(forwardSelection.anchor.offset))
          } else if (child._key === forwardSelection.focus.path[2]['_key']) {
            text.push(child.text.slice(0, forwardSelection.focus.offset))
          } else {
            text.push(child.text)
          }
        }
      }
    } else {
      text.push(block._type)
    }

    if (block._key === forwardSelection.focus.path[0]['_key']) {
      break
    }
  }

  return text
}

function getInlineObjectSelection(
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

          const splitChildText = child.text.split(text)

          if (splitChildText.length === 2) {
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

          const splitText = text.split(child.text)
          const textIndex = text.indexOf(child.text)

          if (splitText.length === 2 && textIndex !== -1) {
            if (splitText[0] === '') {
              anchor = {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: 0,
              }
              continue
            }
            if (splitText[splitText.length - 1] === '') {
              focus = {
                path: [{_key: block._key}, 'children', {_key: child._key}],
                offset: child.text.length,
              }
              continue
            }
            if (splitText.join('') !== text) {
              continue
            }
            break
          }

          const overlap = stringOverlap(child.text, text)

          if (overlap !== '') {
            if (child.text.lastIndexOf(overlap) > 0) {
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
              continue
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

export function stringOverlap(string: string, searchString: string) {
  let overlap = ''

  for (let i = 0; i < string.length; i++) {
    const slice = string.slice(i)
    const split = searchString.split(slice)

    if (split.length > 1 && split[0] === '') {
      overlap = slice
      break
    }

    if (split.length === 2 && split.join('') !== searchString) {
      overlap = slice
      break
    }

    const reverseSlice = string.slice(0, i)
    const reverseSliceSplit = searchString.split(reverseSlice)

    if (reverseSlice !== '' && reverseSliceSplit[reverseSliceSplit.length - 1] === '') {
      overlap = reverseSlice
      break
    }
  }

  return overlap
}

function reverseTextSelection(selection: EditorSelection): EditorSelection {
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

export function getBlockKey(value: Array<PortableTextBlock> | undefined, text: string) {
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

async function getNewBlockKeys(editor: Editor, step: () => Promise<void>) {
  const value = await editor.getValue()
  const blockKeysBefore = getBlockKeys(value)

  await step()

  const newValue = await editor.getValue()

  return getBlockKeys(newValue).filter((blockKey) => !blockKeysBefore.includes(blockKey))
}

function getBlockKeys(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return []
  }

  return value.map((block) => block._key)
}

async function getNewAnnotations(editor: Editor, step: () => Promise<void>) {
  const value = await editor.getValue()
  const annotationsBefore = getAnnotations(value)

  await step()

  const newValue = await editor.getValue()

  return getAnnotations(newValue).filter((annotation) => !annotationsBefore.includes(annotation))
}

function getAnnotations(value: Array<PortableTextBlock> | undefined): Array<string> {
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
