/** @jest-environment ./setup/collaborative.jest.env.ts */
import {describe, expect, it, test} from '@jest/globals'
import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import {type PortableTextBlock} from '@sanity/types'

import {type EditorSelection, type EditorSelectionPoint} from '../../src'
import {type Editor} from '../setup/globals.jest'

describe('Feature: Annotations', () => {
  it('Scenario: Undoing the deletion of the last char of annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Redoing the deletion of the last char of annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    // When "redo" is performed
    await editorA.redo()

    // Then the text is "fo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo']))

    // And "fo" is marked with (m1)
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Undoing inserting text after annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Space" is pressed
    await editorA.pressKey(' ')

    // Then the text is "foo, "
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', ' ']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And " " has no marks
    await getEditorTextMarks(editorA, ' ').then((marks) => expect(marks).toEqual([]))

    // And when an "undo" is performed
    await editorA.undo()

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Undoing local annotation before remote annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA, editorB] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When editor "B" adds a "comment" around "bar"
    const m2 = await markEditorText(editorB, 'bar', 'm')
    marksMap.set('m2', m2 ?? [])

    // And editor "A" performs "undo"
    await editorA.undo()

    // Then the text is "foo,bar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', 'bar']))

    // And "foo" has no marks
    await getEditorTextMarks(editorA, 'foo').then((marks) => expect(marks).toEqual([]))

    // And "bar" is marked with (m2)
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m2')),
    )
  })

  it('Scenario: Undoing and redoing inserting text after annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Space" is pressed
    await editorA.pressKey(' ')

    // And an "undo" is performed
    await editorA.undo()

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And when "redo" is performed
    await editorA.redo()

    // Then the text is "foo, "
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', ' ']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And " " has no marks
    await getEditorTextMarks(editorA, ' ').then((marks) => expect(marks).toEqual([]))
  })

  it("Scenario: Editor B inserting text after Editor A's half-deleted annotation", async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA, editorB] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And editor B select "fo"
    await selectEditorText(editorB, 'fo')

    // And editor B presses "ArrowRight"
    await editorB.pressKey('ArrowRight')

    // And editor B types "1"
    await editorB.type('1')

    // Then the text is "fo,1"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', '1']))

    // And "fo" is marked with (m1)
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "1" has no marks
    await getEditorTextMarks(editorA, '1').then((marks) => expect(marks).toEqual([]))
  })

  it('Scenario: Writing on top of annotation', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And a "comment" around "bar"
    await markEditorText(editorA, 'bar', 'm')

    // When "removed" is typed
    await editorA.type('removed')

    // Then the text is "foo removed baz"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo removed baz']))

    // And "foo removed baz" has no marks
    await getEditorTextMarks(editorA, 'foo removed baz').then((marks) => expect(marks).toEqual([]))
  })

  it('Scenario: Undoing the deletion of block with annotation at the end', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo bar"
    await editorA.insertText('foo bar')

    // And a "comment" (m1) around "bar"
    const marks = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m1', marks ?? [])

    // When "foo bar" is selected
    await selectEditorText(editorA, 'foo bar')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    // Then the text is "foo ,bar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo ', 'bar']))

    // And "bar" is marked with (m1)
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Undoing deletion of annotated block', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const marks = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', marks ?? [])

    // When "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))

    // And "foo" is marked with (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Deleting emphasised paragraph with comment in the middle', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And "em" around "foo bar baz"
    await markEditorText(editorA, 'foo bar baz', 'i')

    // And "comment" around "bar"
    await markEditorText(editorA, 'bar', 'm')

    // When "foo bar baz" is selected
    await selectEditorText(editorA, 'foo bar baz')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // Then the editor is empty
    await editorA.getValue().then((value) => expect(value).toEqual([]))
  })

  it('Scenario: Toggling bold inside italic', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And "em" around "foo bar baz"
    await markEditorText(editorA, 'foo bar baz', 'i')

    // When "bar" is marked with "strong"
    await markEditorText(editorA, 'bar', 'b')

    // Then the text is "foo ,bar, baz"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo ', 'bar', ' baz']))

    // And "foo " is marked with "em"
    await getEditorTextMarks(editorA, 'foo ').then((marks) => expect(marks).toEqual(['em']))

    // And "bar" is marked with "em,strong"
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(['em', 'strong']),
    )

    // And " baz" is marked with "em"
    await getEditorTextMarks(editorA, ' baz').then((marks) => expect(marks).toEqual(['em']))

    // And when "strong" is remove from "bar"
    await markEditorText(editorA, 'bar', 'b')

    // Then the text is "foo bar baz"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo bar baz']))

    // And "foo bar baz" is marked with "em"
    await getEditorTextMarks(editorA, 'foo bar baz').then((marks) => expect(marks).toEqual(['em']))
  })

  it('Scenario: Toggling bold inside italic as you write', async () => {
    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "italic" is toggled
    await editorA.toggleMark('i')

    // And "foo " is typed
    await editorA.type('foo ')

    // And "bold" is toggled
    await editorA.toggleMark('b')

    // And "bar" is typed
    await editorA.type('bar')

    // And "bold" is toggled
    await editorA.toggleMark('b')

    // And " baz" is typed
    await editorA.type(' baz')

    // Then the text is "foo ,bar, baz"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo ', 'bar', ' baz']))

    // And "foo " is marked with "em"
    await getEditorTextMarks(editorA, 'foo ').then((marks) => expect(marks).toEqual(['em']))

    // And "bar" is marked with "em,strong"
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(['em', 'strong']),
    )

    // And " baz" is marked with "em"
    await getEditorTextMarks(editorA, ' baz').then((marks) => expect(marks).toEqual(['em']))
  })

  it('Scenario: Deleting marked text and writing again, unmarked', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // When "foo" is marked with "strong"
    await markEditorText(editorA, 'foo', 'b')

    // Then "foo" is marked with "strong"
    await getEditorTextMarks(editorA, 'foo').then((marks) => expect(marks).toEqual(['strong']))

    // And when "ArrowRight" is pressed
    await editorA.pressKey('ArrowRight')

    // And "Backspace" is pressed "3" times
    await editorA.pressKey('Backspace', 3)

    // And "bar" is typed
    await editorA.type('bar')

    // Then "bar" has no marks
    await getEditorTextMarks(editorA, 'bar').then((marks) => expect(marks).toEqual([]))
  })

  it('Scenario: Adding bold across an empty block and typing in the same', async () => {
    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.type('foo')

    // And "Enter" is pressed "2" times
    await editorA.pressKey('Enter', 2)

    // And "bar" is typed
    await editorA.type('baz')

    // And "foobar" is marked with "strong"
    await markEditorText(editorA, 'foobaz', 'b')

    // And the caret is put after "foo"
    await selectAfterEditorText(editorA, 'foo')

    // And the caret is moved down
    await editorA.pressKey('ArrowDown')

    // And "bar" is typed
    await editorA.type('bar')

    // Then "bar" is marked with "strong"
    await getEditorTextMarks(editorA, 'bar').then((marks) => expect(marks).toEqual(['strong']))
  })

  it('Scenario: Toggling bold across an empty block', async () => {
    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.type('foo')

    // And "Enter" is pressed "2" times
    await editorA.pressKey('Enter', 2)

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "foo,\n,,\n,bar"
    await getEditorText(editorA).then((text) =>
      expect(text).toEqual(['foo', '\n', '', '\n', 'bar']),
    )

    // And when "ooba" is selected
    await selectEditorText(editorA, 'ooba')

    // And "bold" is toggled
    await editorA.toggleMark('b')

    // Then the text is "f,oo,\n,,\n,ba,r"
    await getEditorText(editorA).then((text) =>
      expect(text).toEqual(['f', 'oo', '\n', '', '\n', 'ba', 'r']),
    )

    // And "oo" is marked with "strong"
    await getEditorTextMarks(editorA, 'oo').then((marks) => expect(marks).toEqual(['strong']))

    // And "ba" is marked with "strong"
    await getEditorTextMarks(editorA, 'ba').then((marks) => expect(marks).toEqual(['strong']))

    // And when "bold" is toggled
    await editorA.toggleMark('b')

    // Then the text is "foo,\n,,\n,bar"
    await getEditorText(editorA).then((text) =>
      expect(text).toEqual(['foo', '\n', '', '\n', 'bar']),
    )
  })
})

/********************
 * Step helpers
 ********************/

function getEditorText(editor: Editor) {
  return editor.getValue().then(getText)
}

function getText(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return undefined
  }

  const text: Array<string> = []

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      if (text.length > 0) {
        text.push('\n')
      }
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          text.push(child.text)
        }
      }
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

function getEditorTextMarks(editor: Editor, text: string) {
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

async function markEditorText(editor: Editor, text: string, mark: string) {
  await selectEditorText(editor, text)
  await editor.toggleMark(mark)
  return editor.getValue().then((value) => getTextMarks(value, text))
}

function selectEditorText(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(editor.setSelection)
}

function selectAfterEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() => editor.pressKey('ArrowRight'))
}

/********************
 * Utility functions
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
