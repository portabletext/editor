import {ParameterType} from '@cucumber/cucumber-expressions'
import {expect} from '@jest/globals'

import {Given, Then, When} from './gherkin-driver'
import {
  getEditorBlockKey,
  getEditorText,
  getEditorTextMarks,
  getSelectionFocusText,
  getSelectionText,
  insertBlockObject,
  insertEditorText,
  selectAfterEditorInlineObject,
  selectAfterEditorText,
  selectBeforeEditorInlineObject,
  selectBeforeEditorText,
  selectEditorInlineObject,
  selectEditorText,
  selectEditorTextBackwards,
  selectionIsCollapsed,
  toggleAnnotation,
} from './gherkin-step-helpers'

export const stepDefinitions = [
  /**
   * Editor steps
   */
  Given('an empty editor', async () => {
    await setDocumentValue([])
  }),
  When('editors have settled', async () => {
    await waitForRevision()
  }),
  Then('the editor is empty', async ({editorA}) => {
    await editorA.getValue().then((value) => expect(value).toEqual([]))
  }),

  /**
   * Text steps
   */
  Given('the text {string}', async ({editorA}, text: string) => {
    await insertEditorText(editorA, text)
  }),
  Then('the text is {text}', async ({editorA}, text: string) => {
    await getEditorText(editorA).then((actualText) => expect(actualText).toEqual(text))
  }),

  /**
   * Typing steps
   */
  When('{string} is typed', async ({editorA}, text: string) => {
    await editorA.type(text)
  }),
  When('{string} is typed by editor B', async ({editorB}, text: string) => {
    await editorB.type(text)
  }),

  /**
   * Text block steps
   */
  Given(
    'the text {string} in block {key}',
    async ({editorA, keyMap}, text: string, keyKey: string) => {
      const key = await insertEditorText(editorA, text)
      keyMap.set(keyKey, key)
    },
  ),
  Then('{string} is in block {key}', async ({editorA, keyMap}, text: string, keyKey: string) => {
    await getEditorBlockKey(editorA, text).then((key) => expect(key).toEqual(keyMap.get(keyKey)))
  }),

  /**
   * Object steps
   */
  Given('a(n) {block-object}', async ({editorA}) => {
    await insertBlockObject(editorA, 'image')
  }),
  Given(
    'a(n) {block-object} {key}',
    async ({editorA, keyMap}, blockObject: 'image', keyKey: string) => {
      const newBlockKeys = await insertBlockObject(editorA, blockObject)
      keyMap.set(keyKey, newBlockKeys[0])
    },
  ),
  Given('a(n) {inline-object}', async ({editorA}) => {
    await editorA.pressButton('insert-stock-ticker')
  }),

  /**
   * Mark steps
   */
  Given(
    'a(n) {annotation} {key} around {string}',
    async ({editorA, keyMap}, annotation: 'comment' | 'link', keyKey: string, text: string) => {
      await selectEditorText(editorA, text)
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  Given(
    'a(n) {annotation} {key} around {string} by editor B',
    async ({editorB, keyMap}, annotation: 'comment' | 'link', keyKey: string, text: string) => {
      await selectEditorText(editorB, text)
      const key = await toggleAnnotation(editorB, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  When('{annotation} is toggled', async ({editorA}, annotation: 'comment' | 'link') => {
    await toggleAnnotation(editorA, annotation)
  }),
  When(
    '{annotation} {key} is toggled',
    async ({editorA, keyMap}, annotation: 'comment' | 'link', keyKey: string) => {
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key ?? [])
    },
  ),
  When(
    '{string} is marked with a(n) {annotation} {key}',
    async ({editorA, keyMap}, text: string, annotation: 'comment' | 'link', keyKey: string) => {
      await selectEditorText(editorA, text)
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  When(
    '{string} is marked with {decorator}',
    async ({editorA}, text: string, decorator: 'em' | 'strong') => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  Given(
    '{decorator} around {string}',
    async ({editorA}, decorator: 'em' | 'strong', text: string) => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  When(
    '{decorator} is toggled using the keyboard',
    async ({editorA}, decorator: 'em' | 'strong') => {
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  Then(
    '{string} has marks {marks}',
    async ({editorA, keyMap}, text: string, marks: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((actualMarks) => {
        expect(actualMarks).toEqual(
          (marks ?? []).flatMap((mark) =>
            mark === 'em' || mark === 'strong' ? [mark] : (keyMap.get(mark) ?? []),
          ),
        )
      })
    },
  ),
  Then('{string} has no marks', async ({editorA}, text: string) => {
    await getEditorTextMarks(editorA, text).then((marks) => expect(marks).toEqual([]))
  }),

  /**
   * Selection steps
   */
  When('{string} is being selected', async ({editorA}, text: string) => {
    if (text === 'stock-ticker') {
      await selectEditorInlineObject(editorA, text)
    } else {
      await selectEditorText(editorA, text)
    }
  }),
  When('{string} is being selected backwards', async ({editorA}, text: string) => {
    await selectEditorTextBackwards(editorA, text)
  }),
  When('the caret is put before {string}', async ({editorA}, text: string) => {
    if (text === 'stock-ticker') {
      await selectBeforeEditorInlineObject(editorA, text)
    } else {
      await selectBeforeEditorText(editorA, text)
    }
  }),
  When('the caret is put after {string}', async ({editorA}, text: string) => {
    if (text === 'stock-ticker') {
      await selectAfterEditorInlineObject(editorA, text)
    } else {
      await selectAfterEditorText(editorA, text)
    }
  }),
  When('the caret is put after {string} by editor B', async ({editorB}, text: string) => {
    await selectAfterEditorText(editorB, text)
  }),
  Then('{text} is selected', async ({editorA}, text: Array<string>) => {
    const value = await editorA.getValue()
    const selection = await editorA.getSelection()

    expect(getSelectionText(value, selection)).toEqual(text)
  }),
  Then('block {key} is selected', async ({editorA, keyMap}, keyKey: string) => {
    await editorA.getSelection().then((selection) => {
      expect(selection?.anchor.path[0]['_key']).toEqual(keyMap.get(keyKey))
      expect(selection?.focus.path[0]['_key']).toEqual(keyMap.get(keyKey))
    })
  }),
  Then('the caret is before {string}', async ({editorA}, text: string) => {
    const value = await editorA.getValue()
    const selection = await editorA.getSelection()

    const collapsed = selectionIsCollapsed(selection)
    const focusText = getSelectionFocusText(value, selection)

    expect(collapsed).toBe(true)
    expect(focusText?.slice(selection?.focus.offset)).toBe(text)
  }),
  Then('the caret is after {string}', async ({editorA}, text: string) => {
    const value = await editorA.getValue()
    const selection = await editorA.getSelection()

    const collapsed = selectionIsCollapsed(selection)
    const focusText = getSelectionFocusText(value, selection)

    expect(collapsed).toBe(true)
    expect(focusText?.slice(0, selection?.focus.offset)).toBe(text)
  }),

  /**
   * Button steps
   */
  When('{button} is pressed', async ({editorA}, button: string) => {
    await editorA.pressKey(button)
  }),
  When('{button} is pressed with navigation intent', async ({editorA}, button: string) => {
    await editorA.pressKey(button, 1, 'navigation')
  }),
  When('{button} is pressed {int} times', async ({editorA}, button: string, times: number) => {
    await editorA.pressKey(button, times)
  }),

  /**
   * Undo/redo steps
   */
  When('undo is performed', async ({editorA}) => {
    await editorA.undo()
  }),
  When('redo is performed', async ({editorA}) => {
    await editorA.redo()
  }),
]

export const parameterTypes = [
  new ParameterType('annotation', /"(comment|link)"/, String, (input) => input, false, true),
  new ParameterType('block-object', /"(image)"/, String, (input) => input, false, true),
  new ParameterType('inline-object', /"(stock-ticker)"/, String, (input) => input, false, true),
  new ParameterType(
    'button',
    /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space)"/,
    String,
    (input) => (input === 'Space' ? ' ' : input),
    false,
    true,
  ),
  new ParameterType('key', /"([a-z]\d)"/, String, (input) => input, false, true),
  new ParameterType('decorator', /"(em|strong)"/, String, (input) => input, false, true),
  new ParameterType(
    'marks',
    /"((strong|em|[a-z]\d)(,(strong|em|[a-z]\d))*)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  new ParameterType(
    'text',
    /"([a-z-,\\n ]*)"/,
    Array,
    (input) =>
      input.split(',').map((item) => {
        if (item === '\\n') {
          return '\n'
        }
        return item
      }),
    false,
    true,
  ),
]
