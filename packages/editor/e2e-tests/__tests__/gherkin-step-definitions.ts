import {ParameterType} from '@cucumber/cucumber-expressions'
import {expect} from '@jest/globals'

import {defineStep} from './gherkin-driver'
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
  defineStep('an image', async ({editorA}) => {
    await editorA.pressButton('insert-image')
  }),

  /**
   * Annotation and mark steps
   */
  defineStep(
    'a(n) {annotation} {key} around {string}',
    async ({editorA, keyMap}, annotation: string, keyKey: string, text: string) => {
      const key = await markEditorText(editorA, text, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  defineStep(
    '{annotation} {key} is added',
    async ({editorA, keyMap}, annotation: string, keyKey: string) => {
      const key = await markEditorSelection(editorA, annotation)
      keyMap.set(keyKey, key ?? [])
    },
  ),
  defineStep('{mark} around {string}', async ({editorA}, mark: string, text: string) => {
    await markEditorText(editorA, text, mark)
  }),
  defineStep('{string} is marked with {mark}', async ({editorA}, text: string, mark: string) => {
    await markEditorText(editorA, text, mark)
  }),
  defineStep('{mark} is toggled', async ({editorA}, mark: string) => {
    await editorA.toggleMark(mark)
  }),
  defineStep(
    '{string} is marked with {keys}',
    async ({editorA, keyMap}, text: string, keys: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((marks) =>
        expect(marks).toEqual(keys.flatMap((key) => keyMap.get(key))),
      )
    },
  ),
  defineStep(
    '{string} has marks {marks}',
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
  defineStep('the caret is put before {string}', async ({editorA}, text: string) => {
    await selectBeforeEditorText(editorA, text)
  }),
  defineStep('the caret is put after {string} by editor B', async ({editorB}, text: string) => {
    await selectAfterEditorText(editorB, text)
  }),

  /**
   * Button steps
   */
  defineStep('{button} is pressed', async ({editorA}, button: string) => {
    await editorA.pressKey(button)
  }),
  defineStep(
    '{button} is pressed {int} times',
    async ({editorA}, button: string, times: number) => {
      await editorA.pressKey(button, times)
    },
  ),
]

export const parameterTypes = [
  new ParameterType(
    'annotation',
    /"(comment|link)"/,
    String,
    (input) => (input === 'comment' ? 'm' : input === 'link' ? 'l' : input),
    false,
    true,
  ),
  new ParameterType(
    'button',
    /"(ArrowUp|ArrowDown|Backspace|Delete|Enter)"/,
    String,
    (input) => input,
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
  new ParameterType(
    'mark',
    /"(em|strong)"/,
    String,
    (input) => (input === 'em' ? 'i' : input === 'strong' ? 'b' : input),
    false,
    true,
  ),
  new ParameterType(
    'marks',
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
