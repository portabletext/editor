import {expect, test} from '@jest/globals'
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

function getText(value: Array<PortableTextBlock> | undefined) {
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
        }
      }
    } else {
      text.push(block._type)
    }
  }

  return text
}

test(getText.name, () => {
  const fooBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo'}],
  }
  const emptyBlock = {
    _key: 'b2',
    _type: 'block',
    children: [{_key: 's2', _type: 'span', text: ''}],
  }
  const barBlock = {
    _key: 'b3',
    _type: 'block',
    children: [{_key: 's3', _type: 'span', text: 'bar'}],
  }

  expect(getText([fooBlock, barBlock])).toEqual(['foo', '\n', 'bar'])
  expect(getText([emptyBlock, barBlock])).toEqual(['', '\n', 'bar'])
  expect(getText([fooBlock, emptyBlock, barBlock])).toEqual(['foo', '\n', '', '\n', 'bar'])
})

export function getEditorTextMarks(editor: Editor, text: string) {
  return editor.getValue().then((value) => getTextMarks(value, text))
}

function getTextMarks(value: Array<PortableTextBlock> | undefined, text: string) {
  if (!value) {
    return undefined
  }

  let marks: Array<string> | undefined = undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.text === text) {
          marks = child.marks
          break
        }
      }
    }
  }

  return marks
}

test(getTextMarks.name, () => {
  const fooBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo'}],
  }
  const splitBarBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'ba', marks: ['strong']},
      {_key: 's2', _type: 'span', text: 'r'},
    ],
  }

  expect(getTextMarks([fooBlock, splitBarBlock], 'ba')).toEqual(['strong'])
})

export async function markEditorSelection(editor: Editor, mark: string) {
  return getNewAnnotations(editor, async () => {
    await editor.toggleMark(mark)
  })
}

export async function markEditorText(editor: Editor, text: string, mark: string) {
  return getNewAnnotations(editor, async () => {
    await selectEditorText(editor, text)
    await editor.toggleMark(mark)
  })
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

function getTextSelection(
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

test(getTextSelection.name, () => {
  const joinedBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo bar baz'}],
  }

  expect(getTextSelection([joinedBlock], 'foo ')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
  })
  expect(getTextSelection([joinedBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
  })
  expect(getTextSelection([joinedBlock], ' baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 11},
  })

  const noSpaceBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo'},
      {_key: 's2', _type: 'span', text: 'bar'},
    ],
  }

  expect(getTextSelection([noSpaceBlock], 'obar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
  })

  const splitBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo '},
      {_key: 's2', _type: 'span', text: 'bar'},
      {_key: 's3', _type: 'span', text: ' baz'},
    ],
  }

  expect(getTextSelection([splitBlock], 'foo')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 1},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'foo bar baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'o bar b')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 2},
  })

  const twoBlocks = [
    {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'foo'}],
    },
    {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'bar'}],
    },
  ]

  expect(getTextSelection(twoBlocks, 'ooba')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
    focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 2},
  })
})

function getSelectionText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
): string {
  if (!value) {
    throw new Error(`Unable to find text for value ${value}`)
  }
  const forwardSelection = selection?.backward ? reverseTextSelection(selection) : selection

  if (!selection || !forwardSelection) {
    throw new Error(`Unable to find text for selection ${selection}`)
  }

  if (selection.anchor.path.length < 3 || selection.focus.path.length < 3) {
    throw new Error(`Unable to find text for selection ${selection}`)
  }

  let text = ''

  for (const block of value) {
    if (block._key !== forwardSelection.anchor.path[0]['_key']) {
      continue
    }

    if (block._key !== forwardSelection.focus.path[0]['_key']) {
      continue
    }

    if (!isPortableTextBlock(block)) {
      continue
    }

    for (const child of block.children) {
      if (!isPortableTextSpan(child)) {
        continue
      }

      if (child._key === forwardSelection.anchor.path[2]['_key']) {
        text += child.text.slice(forwardSelection.anchor.offset)
        continue
      }

      if (child._key === forwardSelection.focus.path[2]['_key']) {
        text += child.text.slice(0, forwardSelection.focus.offset)
        break
      }
    }
  }

  return text
}

test(getSelectionText.name, () => {
  const noSpaceBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo'},
      {_key: 's2', _type: 'span', text: 'bar'},
    ],
  }

  expect(
    getSelectionText([noSpaceBlock], {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
    }),
  ).toEqual('obar')
  expect(
    getSelectionText([noSpaceBlock], {
      anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
      backward: true,
    }),
  ).toEqual('obar')
})

function stringOverlap(string: string, searchString: string) {
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

test(stringOverlap.name, () => {
  expect(stringOverlap('foo ', 'o bar b')).toBe('o ')
  expect(stringOverlap('bar', 'o bar b')).toBe('bar')
  expect(stringOverlap(' baz', 'o bar b')).toBe(' b')
})

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

function getBlockKey(value: Array<PortableTextBlock> | undefined, text: string) {
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

test(getBlockKey.name, () => {
  const emptyBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: ''}],
  }
  const fooBlock = {
    _key: 'b2',
    _type: 'block',
    children: [{_key: 's2', _type: 'span', text: 'foo'}],
  }

  expect(getBlockKey([emptyBlock, fooBlock], '')).toBe('b1')
  expect(getBlockKey([emptyBlock, fooBlock], 'foo')).toBe('b2')
})

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
