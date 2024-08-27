/** @jest-environment ./setup/collaborative.jest.env.ts */
import {describe, expect, it} from '@jest/globals'

import {
  getEditorBlockKey,
  getEditorText,
  getEditorTextMarks,
  insertEditorText,
  markEditorSelection,
  markEditorText,
  selectAfterEditorText,
  selectBeforeEditorText,
  selectEditorText,
  selectEditorTextBackwards,
} from './step-helpers.test'

describe('Feature: Annotations', () => {
  it('Scenario: Deleting half of annotated text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And a "comment" (m1) around "foo bar baz"
    const m1 = await markEditorText(editorA, 'foo bar baz', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "a baz" is selected
    await selectEditorTextBackwards(editorA, ' baz')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // Then the text is "foo bar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo bar']))

    // And "foo bar" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Deleting annotation in the middle of text', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And a "comment" (m1) around "bar"
    const m1 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "bar " is selected
    await selectEditorText(editorA, 'bar ')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // Then the text is "foo baz"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo baz']))

    // And "foo baz" has no marks
    await getEditorTextMarks(editorA, 'foo baz').then((marks) => expect(marks).toEqual([]))
  })

  it("Scenario: Editor B inserting text after Editor A's half-deleted annotation", async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA, editorB] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

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

  it('Scenario: Splitting a block at the beginning', async () => {
    const keysMap = new Map<string, string>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    const b1 = await insertEditorText(editorA, 'foo')
    keysMap.set('b1', b1)

    // When the caret is put before "foo"
    await selectBeforeEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then the text is ",\n,foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['', '\n', 'foo']))

    // And "foo" is in block "b1"
    await getEditorBlockKey(editorA, 'foo').then((key) => expect(key).toEqual(keysMap.get('b1')))
  })

  it('Scenario: Splitting a block at the middle', async () => {
    const keysMap = new Map<string, string>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    const b1 = await insertEditorText(editorA, 'foo')
    keysMap.set('b1', b1)

    // When the caret is put after "fo"
    await selectAfterEditorText(editorA, 'fo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then the text is "fo,\n,o"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', '\n', 'o']))

    // And "fo" is in block "b1"
    await getEditorBlockKey(editorA, 'fo').then((key) => expect(key).toEqual(keysMap.get('b1')))
  })

  it('Scenario: Splitting a block at the end', async () => {
    const keysMap = new Map<string, string>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    const b1 = await insertEditorText(editorA, 'foo')
    keysMap.set('b1', b1)

    // When the caret is put after "foo"
    await selectAfterEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then the text is "foo,\n,"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', '\n', '']))

    // And "foo" is in block "b1"
    await getEditorBlockKey(editorA, 'foo').then((key) => expect(key).toEqual(keysMap.get('b1')))
  })

  /**
   * Warning: Possible wrong behaviour
   * "bar" should be marked with "strong"
   */
  it('Scenario: Splitting block before decorator', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And "foo" is marked with "strong"
    await markEditorText(editorA, 'foo', 'b')

    // When the caret is put before "foo"
    await selectBeforeEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "ArrowUp" is pressed
    await editorA.pressKey('ArrowUp')

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "bar,\n,foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['bar', '\n', 'foo']))

    // And "bar" has no marks
    await getEditorTextMarks(editorA, 'bar').then((marks) => expect(marks).toEqual([]))

    // And "foo" is marked with "strong"
    await getEditorTextMarks(editorA, 'foo').then((marks) => expect(marks).toEqual(['strong']))
  })

  it('Scenario: Splitting block before annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When the caret is put before "foo"
    await selectBeforeEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then the text is ",\n,foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['', '\n', 'foo']))

    // And "" has no marks
    await getEditorTextMarks(editorA, '').then((marks) => expect(marks).toEqual([]))

    // And "foo" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Splitting block after annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When the caret is put after "foo"
    await selectAfterEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then the text is "foo,\n,"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', '\n', '']))

    // And "foo" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "" has no marks
    await getEditorTextMarks(editorA, '').then((marks) => expect(marks).toEqual([]))
  })

  it('Scenario: Splitting an annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And "foobar" is marked with "comment" (m1)
    const m1 = await markEditorText(editorA, 'foobar', 'm')
    marksMap.set('m1', m1 ?? [])

    // When the caret is put after "foo"
    await selectAfterEditorText(editorA, 'foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // Then "foo" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "bar" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Merging blocks with annotations', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.insertText('foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "bar" is typed
    await editorA.insertText('bar')

    // And "foo" is marked with "comment" (m1)
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // And "bar" is marked with "comment" (m2)
    const m2 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m2', m2 ?? [])

    // And the caret is put before "bar"
    await selectBeforeEditorText(editorA, 'bar')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // Then the text is "foo,bar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo', 'bar']))

    // And "foo" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "bar" is marked with "comment" (m2)
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m2')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "f" and "r" should end up on the same line
   */
  it('Scenario: Deleting across annotated blocks', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.insertText('foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "bar" is typed
    await editorA.insertText('bar')

    // And "foo" is marked with "comment" (m1)
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // And "bar" is marked with "comment" (m2)
    const m2 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m2', m2 ?? [])

    // When "ooba" is selected
    await selectEditorText(editorA, 'ooba')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // Then the text is "f,r"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['f', '\n', 'r']))

    // And "f" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'f').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "r" is marked with "comment" (m2)
    await getEditorTextMarks(editorA, 'r').then((marks) =>
      expect(marks).toEqual(marksMap.get('m2')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "foo" should also be marked with a comment
   */
  it('Scenario: Adding annotation across blocks', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.insertText('foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "bar" is typed
    await editorA.insertText('bar')

    // And "foobar" is selected
    await selectEditorText(editorA, 'foobar')

    // And "comment" (m1) is added
    const m1 = await markEditorSelection(editorA, 'm')
    marksMap.set('m1', m1 ?? [])

    // Then "foo" has no marks
    await getEditorTextMarks(editorA, 'foo').then((marks) => expect(marks).toEqual([]))

    // And "bar" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'bar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "bar" should also be marked with a comment
   */
  it('Scenario: Adding annotation across blocks (backward selection)', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given an empty editor
    setDocumentValue([])

    // When "foo" is typed
    await editorA.insertText('foo')

    // And "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "bar" is typed
    await editorA.insertText('bar')

    // And "foobar" is selected backwards
    await selectEditorTextBackwards(editorA, 'foobar')

    // And "comment" (m1) is added
    const m1 = await markEditorSelection(editorA, 'm')
    marksMap.set('m1', m1 ?? [])

    // Then "foo" is marked with "comment" (m1)
    await getEditorTextMarks(editorA, 'foo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "bar" has no marks
    await getEditorTextMarks(editorA, 'bar').then((marks) => expect(marks).toEqual([]))
  })

  /**
   * Warning: Possible wrong behaviour
   * "foo" should be marked with l1
   * "b" should be marked with m1,l1
   * "ar" should be marked with l1
   */
  it('Scenario: Overlapping annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "link" (l1) around "bar"
    const l1 = await markEditorText(editorA, 'bar', 'l')
    marksMap.set('l1', l1 ?? [])

    // When "foob" is selected
    await selectEditorText(editorA, 'foob')

    // And "comment" (m1) is added
    const m1 = await markEditorSelection(editorA, 'm')
    marksMap.set('m1', m1 ?? [])

    // Then the text is "foob,ar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foob', 'ar']))

    // And "foob" is marked with l1,m1
    await getEditorTextMarks(editorA, 'foob').then((marks) =>
      expect(marks).toEqual((marksMap.get('l1') ?? []).concat(marksMap.get('m1') ?? [])),
    )

    // And "ar" is marked with l1
    await getEditorTextMarks(editorA, 'ar').then((marks) =>
      expect(marks).toEqual(marksMap.get('l1')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "foo" should be marked with l1
   * "b" should be marked with m1,l1
   * "ar" should be marked with l1
   */
  it('Scenario: Overlapping annotation (backwards selection)', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "lini" (l1) around "bar"
    const l1 = await markEditorText(editorA, 'bar', 'l')
    marksMap.set('l1', l1 ?? [])

    // When "foob" is selected backwards
    await selectEditorTextBackwards(editorA, 'foob')

    // And "comment" (m1) is added
    const m1 = await markEditorSelection(editorA, 'l')
    marksMap.set('m1', m1 ?? [])

    // Then the text is "foob,bar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foob', 'ar']))

    // And "foob" is marked with m1
    await getEditorTextMarks(editorA, 'foob').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "ar" is marked with l1
    await getEditorTextMarks(editorA, 'ar').then((marks) =>
      expect(marks).toEqual(marksMap.get('l1')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "fo" should be marked with m1
   * "o" should be marked with m1,l1
   * "bar" should be marked with l1
   */
  it('Scenario: Overlapping annotation from behind', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "obar" is selected
    await selectEditorText(editorA, 'obar')

    // And "link" (l1) is added
    const l1 = await markEditorSelection(editorA, 'l')
    marksMap.set('l1', l1 ?? [])

    // Then the text is "fo,obar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', 'obar']))

    // And "fo" is marked with m1
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "obar" is marked with l1
    await getEditorTextMarks(editorA, 'obar').then((marks) =>
      expect(marks).toEqual(marksMap.get('l1')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "fo" should be marked with m1
   * "o" should be marked with m1,l1
   * "bar" should be marked with l1
   */
  it('Scenario: Overlapping annotation from behind (backward selection)', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "obar" is selected backwards
    await selectEditorTextBackwards(editorA, 'obar')

    // And "link" (l1) is added
    const l1 = await markEditorSelection(editorA, 'l')
    marksMap.set('l1', l1 ?? [])

    // Then the text is "fo,obar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', 'obar']))

    // And "fo" is marked with m1
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "obar" is marked with m1,l1
    await getEditorTextMarks(editorA, 'obar').then((marks) =>
      expect(marks).toEqual((marksMap.get('m1') ?? []).concat(marksMap.get('l1') ?? [])),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "foob" should be marked with m2
   * "ar" should be marked with m1
   */
  it('Scenario: Overlapping same-type annotation', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "bar"
    const m1 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "foob" is selected
    await selectEditorText(editorA, 'foob')

    // And "comment" (m2) is added
    const m2 = await markEditorSelection(editorA, 'm')
    marksMap.set('m2', m2 ?? [])

    // Then the text is "foob,ar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foob', 'ar']))

    // And "foob" is marked with m1,m2
    await getEditorTextMarks(editorA, 'foob').then((marks) =>
      expect(marks).toEqual((marksMap.get('m1') ?? []).concat(marksMap.get('m2') ?? [])),
    )

    // And "ar" is marked with m1
    await getEditorTextMarks(editorA, 'ar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "foob" should be marked with m2
   * "ar" should be marked with m1
   */
  it('Scenario: Overlapping same-type annotation (backwards selection)', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "bar"
    const m1 = await markEditorText(editorA, 'bar', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "foob" is selected backwards
    await selectEditorTextBackwards(editorA, 'foob')

    // And "comment" (m2) is added
    const m2 = await markEditorSelection(editorA, 'm')
    marksMap.set('m2', m2 ?? [])

    // Then the text is "foob,ar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foob', 'ar']))

    // And "foob" is marked with m2
    await getEditorTextMarks(editorA, 'foob').then((marks) =>
      expect(marks).toEqual(marksMap.get('m2')),
    )

    // And "ar" is marked with m1
    await getEditorTextMarks(editorA, 'ar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )
  })

  it('Scenario: Overlapping same-type annotation from behind', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "obar" is selected
    await selectEditorText(editorA, 'obar')

    // And "comment" (m2) is added
    const m2 = await markEditorSelection(editorA, 'm')
    marksMap.set('m2', m2 ?? [])

    // Then the text is "fo,obar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', 'obar']))

    // And "fo" is marked with m1
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "obar" is marked with m2
    await getEditorTextMarks(editorA, 'obar').then((marks) =>
      expect(marks).toEqual(marksMap.get('m2')),
    )
  })

  /**
   * Warning: Possible wrong behaviour
   * "fo" should be marked with m1
   * "obar" should be marked with m2
   */
  it('Scenario: Overlapping same-type annotation from behind (backwards selection)', async () => {
    const marksMap = new Map<string, Array<string>>()

    const [editorA] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    // And a "comment" (m1) around "foo"
    const m1 = await markEditorText(editorA, 'foo', 'm')
    marksMap.set('m1', m1 ?? [])

    // When "obar" is selected backwards
    await selectEditorTextBackwards(editorA, 'obar')

    // And "comment" (m2) is added
    const m2 = await markEditorSelection(editorA, 'm')
    marksMap.set('m2', m2 ?? [])

    // Then the text is "fo,obar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['fo', 'obar']))

    // And "fo" is marked with m1
    await getEditorTextMarks(editorA, 'fo').then((marks) =>
      expect(marks).toEqual(marksMap.get('m1')),
    )

    // And "obar" is marked with m2
    await getEditorTextMarks(editorA, 'obar').then((marks) =>
      expect(marks).toEqual((marksMap.get('m1') ?? []).concat(marksMap.get('m2') ?? [])),
    )
  })
})
