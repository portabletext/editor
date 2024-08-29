import {ParameterType} from '@cucumber/cucumber-expressions'
import {expect} from '@jest/globals'

import {defineStep} from './gherkin-driver'
import {
  getEditorBlockKey,
  getEditorText,
  getEditorTextMarks,
  getSelectionFocusText,
  insertBlockObject,
  insertEditorText,
  selectAfterEditorText,
  selectBeforeEditorText,
  selectEditorText,
  selectEditorTextBackwards,
  selectionIsCollapsed,
  toggleAnnotation,
} from './gherkin-step-helpers'

export const stepDefinitions = [
  /**
   * Editor steps
   */
  defineStep('an empty editor', async () => {
    await setDocumentValue([])
  }),
  defineStep('editors have settled', async () => {
    await waitForRevision()
  }),
  defineStep('the editor is empty', async ({editorA}) => {
    await editorA.getValue().then((value) => expect(value).toEqual([]))
  }),

  /**
   * Text steps
   */
  defineStep('the text {string}', async ({editorA}, text: string) => {
    await insertEditorText(editorA, text)
  }),
  defineStep('the text is {text}', async ({editorA}, text: string) => {
    await getEditorText(editorA).then((actualText) => expect(actualText).toEqual(text))
  }),

  /**
   * Typing steps
   */
  defineStep('{string} is typed', async ({editorA}, text: string) => {
    await editorA.type(text)
  }),
  defineStep('{string} is typed by editor B', async ({editorB}, text: string) => {
    await editorB.type(text)
  }),

  /**
   * Text block steps
   */
  defineStep(
    'the text {string} in block {key}',
    async ({editorA, keyMap}, text: string, keyKey: string) => {
      const key = await insertEditorText(editorA, text)
      keyMap.set(keyKey, key)
    },
  ),
  defineStep(
    '{string} is in block {key}',
    async ({editorA, keyMap}, text: string, keyKey: string) => {
      await getEditorBlockKey(editorA, text).then((key) => expect(key).toEqual(keyMap.get(keyKey)))
    },
  ),

  /**
   * Block object steps
   */
  defineStep('a(n) {block-object}', async ({editorA}) => {
    await editorA.pressButton('insert-image')
    await editorA.focus()
  }),
  defineStep(
    'a(n) {block-object} {key}',
    async ({editorA, keyMap}, blockObject: 'image', keyKey: string) => {
      const newBlockKeys = await insertBlockObject(editorA, blockObject)
      keyMap.set(keyKey, newBlockKeys[0])
    },
  ),

  /**
   * Annotation and decorator steps
   */
  defineStep(
    'a(n) {annotation} {key} around {string}',
    async ({editorA, keyMap}, annotation: 'comment' | 'link', keyKey: string, text: string) => {
      await selectEditorText(editorA, text)
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  defineStep(
    'a(n) {annotation} {key} around {string} by editor B',
    async ({editorB, keyMap}, annotation: 'comment' | 'link', keyKey: string, text: string) => {
      await selectEditorText(editorB, text)
      const key = await toggleAnnotation(editorB, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  defineStep('{annotation} is toggled', async ({editorA}, annotation: 'comment' | 'link') => {
    await toggleAnnotation(editorA, annotation)
  }),
  defineStep(
    '{annotation} {key} is toggled',
    async ({editorA, keyMap}, annotation: 'comment' | 'link', keyKey: string) => {
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key ?? [])
    },
  ),
  defineStep(
    '{decorator} around {string}',
    async ({editorA}, decorator: 'em' | 'strong', text: string) => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  defineStep(
    '{string} is marked with {decorator}',
    async ({editorA}, text: string, decorator: 'em' | 'strong') => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  defineStep(
    '{decorator} is toggled using the keyboard',
    async ({editorA}, decorator: 'em' | 'strong') => {
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  defineStep(
    '{string} is marked with {keys}',
    async ({editorA, keyMap}, text: string, keys: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((marks) =>
        expect(marks).toEqual(keys.flatMap((key) => keyMap.get(key))),
      )
    },
  ),
  defineStep(
    '{string} has marks {decorators}',
    async ({editorA}, text: string, marks: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((actualMarks) =>
        expect(actualMarks).toEqual(marks),
      )
    },
  ),
  defineStep('{string} has no marks', async ({editorA}, text: string) => {
    await getEditorTextMarks(editorA, text).then((marks) => expect(marks).toEqual([]))
  }),

  /**
   * Selection steps
   */
  defineStep('{string} is selected', async ({editorA}, text: string) => {
    await selectEditorText(editorA, text)
  }),
  defineStep('{string} is selected backwards', async ({editorA}, text: string) => {
    await selectEditorTextBackwards(editorA, text)
  }),
  defineStep('the caret is put after {string}', async ({editorA}, text: string) => {
    await selectAfterEditorText(editorA, text)
  }),
  defineStep('the caret is after {string}', async ({editorA}, text: string) => {
    const value = await editorA.getValue()
    const selection = await editorA.getSelection()

    const collapsed = selectionIsCollapsed(selection)
    const focusText = getSelectionFocusText(value, selection)

    expect(collapsed).toBe(true)
    expect(focusText?.slice(0, selection?.focus.offset)).toBe(text)
  }),
  defineStep('the caret is put before {string}', async ({editorA}, text: string) => {
    await selectBeforeEditorText(editorA, text)
  }),
  defineStep('the caret is before {string}', async ({editorA}, text: string) => {
    const value = await editorA.getValue()
    const selection = await editorA.getSelection()

    const collapsed = selectionIsCollapsed(selection)
    const focusText = getSelectionFocusText(value, selection)

    expect(collapsed).toBe(true)
    expect(focusText?.slice(selection?.focus.offset)).toBe(text)
  }),
  defineStep('the caret is put after {string} by editor B', async ({editorB}, text: string) => {
    await selectAfterEditorText(editorB, text)
  }),
  defineStep('block {key} is selected', async ({editorA, keyMap}, keyKey: string) => {
    await editorA.getSelection().then((selection) => {
      expect(selection?.anchor.path[0]['_key']).toEqual(keyMap.get(keyKey))
      expect(selection?.focus.path[0]['_key']).toEqual(keyMap.get(keyKey))
    })
  }),

  /**
   * Button steps
   */
  defineStep('{button} is pressed', async ({editorA}, button: string) => {
    await editorA.pressKey(button)
  }),
  defineStep('{button} is pressed with navigation intent', async ({editorA}, button: string) => {
    await editorA.pressKey(button, 1, 'navigation')
  }),
  defineStep(
    '{button} is pressed {int} times',
    async ({editorA}, button: string, times: number) => {
      await editorA.pressKey(button, times)
    },
  ),

  /**
   * Undo/redo steps
   */
  defineStep('undo is performed', async ({editorA}) => {
    await editorA.undo()
  }),
  defineStep('redo is performed', async ({editorA}) => {
    await editorA.redo()
  }),
]

export const parameterTypes = [
  new ParameterType('annotation', /"(comment|link)"/, String, (input) => input, false, true),
  new ParameterType('block-object', /"(image)"/, String, (input) => input, false, true),
  new ParameterType(
    'button',
    /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space)"/,
    String,
    (input) => (input === 'Space' ? ' ' : input),
    false,
    true,
  ),
  new ParameterType('key', /"([a-z]\d)"/, String, (input) => input, false, true),
  new ParameterType(
    'keys',
    /"([a-z]\d(,[a-z]\d)*)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  new ParameterType('decorator', /"(em|strong)"/, String, (input) => input, false, true),
  new ParameterType(
    'decorators',
    /"([(em)(strong),]+)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  new ParameterType(
    'text',
    /"([a-z,\\n ]*)"/,
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
