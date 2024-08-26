/** @jest-environment ./setup/collaborative.jest.env.ts */
import {describe, expect, test} from '@jest/globals'

import {getEditorText, insertEditorText} from './step-helpers.test'

describe('Feature: Block Objects', () => {
  test('Scenario: Pressing ArrowUp on a lonely image', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // When "ArrowUp" is pressed
    await editorA.pressKey('ArrowUp')
    await waitForRevision()

    // Then the text is ",\n,image"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['', '\n', 'image']))
  })

  test('Scenario: Pressing ArrowDown on a lonely image', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // And "ArrowUp" is pressed
    await editorA.pressKey('ArrowDown')
    await waitForRevision()

    // Then the text is "image,\n,"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['image', '\n', '']))
  })

  test('Scenario: Pressing ArrowDown on image at the bottom', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await insertEditorText(editorA, 'foo')

    // And an image
    await editorA.pressButton('insert-image')

    // When "ArrowDown" is pressed
    await editorA.pressKey('ArrowDown')
    await waitForRevision()

    // Then the text is ""
    await getEditorText(editorA).then((text) =>
      expect(text).toEqual(['foo', '\n', 'image', '\n', '']),
    )
  })

  test('Scenario: Pressing Backspace on a lonely image', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // When "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "foo" is typed
    await editorA.type('foo')

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))
  })

  test('Scenario: Pressing Delete on a lonely image', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // When "Delete" is pressed
    await editorA.pressKey('Delete')

    // And "foo" is typed
    await editorA.type('foo')

    // Then the text is "foo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foo']))
  })

  test('Scenario: Pressing Backpace on image with text above', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await insertEditorText(editorA, 'foo')

    // And an image
    await editorA.pressButton('insert-image')

    // When "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "foobar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foobar']))
  })

  test('Scenario: Pressing Delete on image with text above', async () => {
    const [editorA] = await getEditors()

    // Given the text "foo"
    await insertEditorText(editorA, 'foo')

    // And an image
    await editorA.pressButton('insert-image')

    // When "Delete" is pressed
    await editorA.pressKey('Delete')

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "foobar"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['foobar']))
  })

  test('Scenario: Pressing Backpace on image with text below', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // When "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "foo" is typed
    await editorA.type('foo')

    // And "ArrowUp" is pressed
    await editorA.pressKey('ArrowUp')

    // And "Backspace" is pressed
    await editorA.pressKey('Backspace')

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "barfoo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['barfoo']))
  })

  test('Scenario: Pressing Delete on image with text below', async () => {
    const [editorA] = await getEditors()

    // Given an image
    await editorA.pressButton('insert-image')

    // When "Enter" is pressed
    await editorA.pressKey('Enter')

    // And "foo" is typed
    await editorA.type('foo')

    // And "ArrowUp" is pressed
    await editorA.pressKey('ArrowUp')

    // And "Delete" is pressed
    await editorA.pressKey('Delete')

    // And "bar" is typed
    await editorA.type('bar')

    // Then the text is "barfoo"
    await getEditorText(editorA).then((text) => expect(text).toEqual(['barfoo']))
  })
})
