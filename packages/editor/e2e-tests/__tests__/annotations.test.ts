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
})
