/** @jest-environment ./setup/collaborative.jest.env.ts */
import {describe, expect, test} from '@jest/globals'

import {
  getEditorText,
  getEditorTextMarks,
  markEditorText,
  selectEditorText,
} from './step-helpers.test'

describe('Feature: Undo/Redo', () => {
  test('Scenario: Undoing the deletion of the last char of annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

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

  test('Scenario: Redoing the deletion of the last char of annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

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

  test('Scenario: Undoing inserting text after annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

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

  test('Scenario: Undoing local annotation before remote annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA, editorB] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When editor "B" adds a "comment" (m2) around "bar"
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

  test('Scenario: Undoing and redoing inserting text after annotated text', async () => {
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

  test('Scenario: Undoing the deletion of block with annotation at the end', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo bar"
    await editorA.insertText('foo bar')

    // And a "comment" (m1) around "bar"
    const m1 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m1', m1 ?? [])

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

  test('Scenario: Undoing deletion of annotated block', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

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
})
