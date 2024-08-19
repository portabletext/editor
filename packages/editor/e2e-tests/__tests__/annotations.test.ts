/** @jest-environment ./setup/collaborative.jest.env.ts */
import '../setup/globals.jest'

import {describe, expect, it} from '@jest/globals'
import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'

describe('Feature: Annotations', () => {
  it('Scenario: Undoing the deletion of the last char of annotated text', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" around the text
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')
    const valueBeforeUndo = await editorA.getValue()
    const commentKey =
      valueBeforeUndo && isPortableTextBlock(valueBeforeUndo[0])
        ? valueBeforeUndo[0].markDefs?.[0]?._key
        : undefined

    // When "Backspace" is pressed once
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.pressKey('Backspace')

    // And an "undo" is performed
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const span =
      valueAfterUndo &&
      isPortableTextBlock(valueAfterUndo[0]) &&
      isPortableTextSpan(valueAfterUndo[0].children[0])
        ? valueAfterUndo[0].children[0]
        : undefined

    // Then the text is "foo"
    expect(span?.text).toBe('foo')

    // And the text is marked with a "comment"
    expect(span?.marks).toEqual([commentKey])
  })

  it('Scenario: Redoing the deletion of the last char of annotated text', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" around the text
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')
    const value = await editorA.getValue()
    const block = value && isPortableTextBlock(value[0]) ? value[0] : undefined
    const commentKey = block?.markDefs?.[0]?._key
    const spanKey = block?.children[0]?._key

    // When "Backspace" is pressed once
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    // When "redo" is performed
    await editorA.redo()

    const valueAfterRedo = await editorA.getValue()
    const blockAfterRedo =
      valueAfterRedo && isPortableTextBlock(valueAfterRedo[0]) ? valueAfterRedo[0] : undefined

    // Then the text is "foo"
    expect(blockAfterRedo?.children[0]?.text).toBe('fo')

    // And the text is marked with a "comment"
    expect(blockAfterRedo?.children[0]?.marks).toEqual([commentKey])

    // And the key is unchanged
    expect(blockAfterRedo?.children[0]?._key).toBe(spanKey)
  })

  it('Scenario: Undoing inserting text after annotated text', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" around the text
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')
    const valueBeforeSpace = await editorA.getValue()
    const commentKey =
      valueBeforeSpace && isPortableTextBlock(valueBeforeSpace[0])
        ? valueBeforeSpace[0].markDefs?.[0]?._key
        : undefined

    // When "Space" is pressed once
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.pressKey(' ')

    const valueAfterSpace = await editorA.getValue()
    const blockAfterSpace =
      valueAfterSpace && isPortableTextBlock(valueAfterSpace[0]) ? valueAfterSpace[0] : undefined

    // Then the text is "foo"
    expect(blockAfterSpace?.children[0]?.text).toBe('foo')

    // And the text is marked with a "comment"
    expect(blockAfterSpace?.children[0]?.marks).toEqual([commentKey])

    // And the subsequent text is " "
    expect(blockAfterSpace?.children[1]?.text).toBe(' ')

    // And the subsequent text has no marks
    expect(blockAfterSpace?.children[1]?.marks).toEqual([])

    // And when an "undo" is performed
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const blockAfterUndo =
      valueAfterUndo && isPortableTextBlock(valueAfterUndo[0]) ? valueAfterUndo[0] : undefined

    // Then the text is "foo"
    expect(blockAfterUndo?.children[0]?.text).toBe('foo')

    // And the text is marked with a "comment"
    expect(blockAfterUndo?.children[0]?.marks).toEqual([commentKey])

    // And the subsequent text is deleted
    expect(blockAfterUndo?.children[1]).toBeUndefined()
  })

  it('Scenario: Undoing local annotation before remote annotation', async () => {
    const [editorA, editorB] = await getEditors()

    // Given the text "foobar"
    await editorA.insertText('foobar')

    const value = await editorA.getValue()
    const block = value && isPortableTextBlock(value[0]) ? value[0] : undefined

    // And a "comment" around "foo"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')

    const valueAfterEditorAMark = await editorA.getValue()
    const blockAfterEditorAMark =
      valueAfterEditorAMark && isPortableTextBlock(valueAfterEditorAMark[0])
        ? valueAfterEditorAMark[0]
        : undefined
    const secondSpanKey = blockAfterEditorAMark?.children[1]._key

    // When editor "B" adds a "comment" around "bar"
    await editorB.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: secondSpanKey!}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: secondSpanKey!}], offset: 3},
    })
    await editorB.toggleMark('m')

    const valueAfterEditorBMark = await editorA.getValue()
    const blockAfterEditorBMark =
      valueAfterEditorBMark && isPortableTextBlock(valueAfterEditorBMark[0])
        ? valueAfterEditorBMark[0]
        : undefined

    // And editor "A" performs "undo"
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const blockAfterUndo =
      valueAfterUndo && isPortableTextBlock(valueAfterUndo[0]) ? valueAfterUndo[0] : undefined

    // Then the "comment" is removed from "foo"
    expect(blockAfterUndo?.children[0]._key).toBe(block?.children[0]._key)
    expect(blockAfterUndo?.children[0].marks).toEqual(block?.children[0].marks)
    expect(blockAfterUndo?.children[0].text).toBe('foo')

    // And "bar" is unchanged
    expect(blockAfterUndo?.children[1]).toEqual(blockAfterEditorBMark?.children[1])
  })

  it('Scenario: Undoing and redoing inserting text after annotated text', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" around the text
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')
    const valueBeforeSpace = await editorA.getValue()
    const commentKey =
      valueBeforeSpace && isPortableTextBlock(valueBeforeSpace[0])
        ? valueBeforeSpace[0].markDefs?.[0]?._key
        : undefined

    // When "Space" is pressed once
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.pressKey(' ')

    // And an "undo" is performed
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const blockAfterUndo =
      valueAfterUndo && isPortableTextBlock(valueAfterUndo[0]) ? valueAfterUndo[0] : undefined

    // Then the text is "foo"
    expect(blockAfterUndo?.children[0]?.text).toBe('foo')

    // And the text is marked with a "comment"
    expect(blockAfterUndo?.children[0]?.marks).toEqual([commentKey])

    // And the subsequent text is deleted
    expect(blockAfterUndo?.children[1]).toBeUndefined()

    // And when "redo" is performed
    await editorA.redo()

    const valueAfterRedo = await editorA.getValue()
    const blockAfterRedo =
      valueAfterRedo && isPortableTextBlock(valueAfterRedo[0]) ? valueAfterRedo[0] : undefined

    // Then the text is "foo"
    expect(blockAfterRedo?.children[0]?.text).toBe('foo')

    // And the text is marked with a "comment"
    expect(blockAfterRedo?.children[0]?.marks).toEqual([commentKey])

    // And the subsequent text is " "
    expect(blockAfterRedo?.children[1]?.text).toBe(' ')

    // And the subsequent text has no marks
    expect(blockAfterRedo?.children[1]?.marks).toEqual([])
  })

  it("Scenario: Editor B inserting text after Editor A's half-deleted annotation", async () => {
    const [editorA, editorB] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    const valueBeforeMark = await editorA.getValue()
    const blockBeforeMark =
      valueBeforeMark && isPortableTextBlock(valueBeforeMark[0]) ? valueBeforeMark[0] : undefined

    // And a "comment" around the text
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')

    const valueAfterMark = await editorA.getValue()
    const blockAfterMark =
      valueAfterMark && isPortableTextBlock(valueAfterMark[0]) ? valueAfterMark[0] : undefined

    // When editor "A" pressed "Backspace"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.pressKey('Backspace')

    const valueAfterBackspace = await editorA.getValue()
    const blockAfterBackspace =
      valueAfterBackspace && isPortableTextBlock(valueAfterBackspace[0])
        ? valueAfterBackspace[0]
        : undefined

    expect(blockAfterBackspace?.children[0]._key).toBe(blockBeforeMark?.children[0]._key)
    expect(blockAfterBackspace?.children[0].text).toBe('fo')
    expect(blockAfterBackspace?.children[0].marks).toEqual(blockAfterMark?.children[0].marks)

    // And editor "B" inserts "1"
    await editorB.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 2},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 2},
    })

    await editorB.pressKey('1')

    await waitForRevision()

    const valueAfterEditorBChange = await editorA.getValue()
    const blockAfterEditorBChange =
      valueAfterEditorBChange && isPortableTextBlock(valueAfterEditorBChange[0])
        ? valueAfterEditorBChange[0]
        : undefined

    // Then "fo" is unchanged
    expect(blockAfterEditorBChange?.children[0]).toEqual(blockAfterBackspace?.children[0])

    // And "1" is inserted
    expect(blockAfterEditorBChange?.children[1].text).toBe('1')
    expect(blockAfterEditorBChange?.children[1].marks).toEqual([])
  })

  it('Scenario: Writing on top of annotation', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And a "comment" around "bar"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 4},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 7},
    })
    await editorA.toggleMark('m')

    const valueAfterMark = await editorA.getValue()
    const blockAfterMark =
      valueAfterMark && isPortableTextBlock(valueAfterMark[0]) ? valueAfterMark[0] : undefined

    // When "removed" is typed
    await editorA.type('removed')

    const valueAfterNewText = await editorA.getValue()
    const blockAfterNewText =
      valueAfterNewText && isPortableTextBlock(valueAfterNewText[0])
        ? valueAfterNewText[0]
        : undefined

    // Then the comment is removed
    expect(blockAfterNewText).toEqual({
      ...blockAfterMark,
      children: [
        {
          ...blockAfterMark?.children[0],
          text: 'foo removed baz',
        },
      ],
      markDefs: [],
    })
  })

  it('Scenario: Undoing the deletion of block with annotation at the end', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar"
    await editorA.insertText('foo bar')

    // And a "comment" around "bar"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 4},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 7},
    })
    await editorA.toggleMark('m')

    const valueAfterMark = await editorA.getValue()
    const blockAfterMark =
      valueAfterMark && isPortableTextBlock(valueAfterMark[0]) ? valueAfterMark[0] : undefined

    // When "foo bar" is deleted
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {
        path: [{_key: 'A-4'}, 'children', {_key: blockAfterMark!.children[1]._key}],
        offset: 3,
      },
    })
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const blockAfterUndo =
      valueAfterUndo && isPortableTextBlock(valueAfterUndo[0]) ? valueAfterUndo[0] : undefined

    // Then the text is unchanged
    expect(blockAfterUndo).toEqual({
      ...blockAfterMark,
      _key: blockAfterUndo?._key,
      children: [
        {
          ...blockAfterMark?.children[0],
          _key: blockAfterUndo?.children[0]?._key,
        },
        {
          ...blockAfterMark?.children[1],
          _key: blockAfterUndo?.children[1]?._key,
        },
      ],
    })
  })

  it('Scenario: Undoing deletion of annotated block', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await editorA.insertText('foo')

    // And a "comment" around "foo"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 3},
    })
    await editorA.toggleMark('m')

    const valueAfterMark = await editorA.getValue()
    const blockAfterMark =
      valueAfterMark && isPortableTextBlock(valueAfterMark[0]) ? valueAfterMark[0] : undefined

    // When "foo" is deleted
    await editorA.pressKey('Backspace')

    // And "undo" is performed
    await editorA.undo()

    const valueAfterUndo = await editorA.getValue()
    const blockAfterUndo =
      valueAfterUndo && isPortableTextBlock(valueAfterUndo[0]) ? valueAfterUndo[0] : undefined

    // Then the text is unchanged
    expect(blockAfterUndo).toEqual({
      ...blockAfterMark,
      _key: blockAfterUndo?._key,
      children: [
        {
          ...blockAfterMark?.children[0],
          _key: blockAfterUndo?.children[0]._key,
        },
      ],
    })
  })

  it('Scenario: Deleting emphasised paragraph with comment in the middle', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And "em" around "foo bar baz"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 11},
    })
    await editorA.toggleMark('i')

    // And a "comment" around "bar"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 4},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 7},
    })
    await editorA.toggleMark('m')

    const valueAfterMark = await editorA.getValue()
    const blockAfterMark =
      valueAfterMark && isPortableTextBlock(valueAfterMark[0]) ? valueAfterMark[0] : undefined

    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {
        path: [{_key: 'A-4'}, 'children', {_key: blockAfterMark!.children[2]._key}],
        offset: 4,
      },
    })

    await editorA.pressKey('Backspace')
  })

  it('Scenario: Toggling bold inside italic', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo bar baz"
    await editorA.insertText('foo bar baz')

    // And "em" around "foo bar baz"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 11},
    })
    await editorA.toggleMark('i')

    // When "bar" is marked with "strong"
    await editorA.setSelection({
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 4},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-3'}], offset: 7},
    })
    await editorA.toggleMark('b')

    const valueWithBold = await editorA.getValue()
    const blockWithBold =
      valueWithBold && isPortableTextBlock(valueWithBold[0]) ? valueWithBold[0] : undefined

    // Then the block is split
    expect(blockWithBold).toEqual({
      _type: 'block',
      _key: blockWithBold?._key,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: blockWithBold?.children[0]._key,
          text: 'foo ',
          marks: ['em'],
        },
        {
          _type: 'span',
          _key: blockWithBold?.children[1]._key,
          text: 'bar',
          marks: ['em', 'strong'],
        },
        {
          _type: 'span',
          _key: blockWithBold?.children[2]._key,
          text: ' baz',
          marks: ['em'],
        },
      ],
    })

    // And when "strong" is remove from bar "bar"
    await editorA.setSelection({
      anchor: {
        path: [{_key: 'A-4'}, 'children', {_key: blockWithBold!.children[1]._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'A-4'}, 'children', {_key: blockWithBold!.children[1]._key}],
        offset: 3,
      },
    })
    await editorA.toggleMark('b')

    const valueWithoutBold = await editorA.getValue()
    const blockWithoutBold =
      valueWithoutBold && isPortableTextBlock(valueWithoutBold[0]) ? valueWithoutBold[0] : undefined

    // Then the block is merged again
    expect(blockWithoutBold).toEqual({
      _type: 'block',
      _key: blockWithBold?._key,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: blockWithBold?.children[0]._key,
          text: 'foo bar baz',
          marks: ['em'],
        },
      ],
    })
  })
})
