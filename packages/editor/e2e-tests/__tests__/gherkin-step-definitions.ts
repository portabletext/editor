import {ParameterType} from '@cucumber/cucumber-expressions'
import {expect} from '@jest/globals'
import {type Editor} from '../setup/globals.jest'
import {Given, Then, When} from './gherkin-driver'
import {
  getEditorBlockKey,
  getEditorText,
  getEditorTextMarks,
  getSelectionBlockKeys,
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

type Context = {
  editorA: Editor
  editorB: Editor
  keyMap: Map<string, Array<string> | string>
}

export const stepDefinitions = [
  /**
   * Background steps
   */
  Given<Context>('a global keymap', async (context) => {
    context['keyMap'] = new Map()
  }),

  Given<Context>('two editors', async (context) => {
    const [editorA, editorB] = await getEditors()
    context['editorA'] = editorA
    context['editorB'] = editorB
  }),

  /**
   * Editor steps
   */
  Given('an empty editor', async () => {
    await setDocumentValue([])
  }),
  When('editors have settled', async () => {
    await waitForRevision()
  }),
  Then('the editor is empty', async ({editorA}: Context) => {
    await editorA.getValue().then((value) => expect(value).toEqual([]))
  }),

  /**
   * Text steps
   */
  Given('the text {string}', async ({editorA}: Context, text: string) => {
    await insertEditorText(editorA, text)
  }),
  Then('the text is {text}', async ({editorA}: Context, text: string) => {
    await getEditorText(editorA).then((actualText) =>
      expect(actualText).toEqual(text),
    )
  }),

  /**
   * Typing steps
   */
  When('{string} is typed', async ({editorA}: Context, text: string) => {
    await editorA.type(text)
  }),
  When(
    '{string} is typed by editor B',
    async ({editorB}: Context, text: string) => {
      await editorB.type(text)
    },
  ),

  /**
   * Text block steps
   */
  Given(
    'the text {string} in block {key}',
    async ({editorA, keyMap}: Context, text: string, keyKey: string) => {
      const key = await insertEditorText(editorA, text)
      keyMap.set(keyKey, key)
    },
  ),
  Then(
    '{string} is in block {key}',
    async ({editorA, keyMap}: Context, text: string, keyKey: string) => {
      await getEditorBlockKey(editorA, text).then((key) =>
        expect(key).toEqual(keyMap.get(keyKey)),
      )
    },
  ),

  /**
   * Object steps
   */
  Given('a(n) {block-object}', async ({editorA}: Context) => {
    await insertBlockObject(editorA, 'image')
  }),
  Given(
    'a(n) {block-object} {key}',
    async (
      {editorA, keyMap}: Context,
      blockObject: 'image',
      keyKey: string,
    ) => {
      const newBlockKeys = await insertBlockObject(editorA, blockObject)
      keyMap.set(keyKey, newBlockKeys[0])
    },
  ),
  Given('a(n) {inline-object}', async ({editorA}: Context) => {
    await editorA.pressButton('insert-stock-ticker')
  }),

  /**
   * Mark steps
   */
  Given(
    'a(n) {annotation} {key} around {string}',
    async (
      {editorA, keyMap}: Context,
      annotation: 'comment' | 'link',
      keyKey: string,
      text: string,
    ) => {
      await selectEditorText(editorA, text)
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  Given(
    'a(n) {annotation} {key} around {string} by editor B',
    async (
      {editorB, keyMap}: Context,
      annotation: 'comment' | 'link',
      keyKey: string,
      text: string,
    ) => {
      await selectEditorText(editorB, text)
      const key = await toggleAnnotation(editorB, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  When(
    '{annotation} is toggled',
    async ({editorA}: Context, annotation: 'comment' | 'link') => {
      await toggleAnnotation(editorA, annotation)
    },
  ),
  When(
    '{annotation} {keys} is toggled',
    async (
      {editorA, keyMap}: Context,
      annotation: 'comment' | 'link',
      keyKeys: Array<string>,
    ) => {
      const keys = await toggleAnnotation(editorA, annotation)

      keyKeys.forEach((keyKey, index) => {
        keyMap.set(keyKey, keys[index])
      })
    },
  ),
  When(
    '{string} is marked with a(n) {annotation} {key}',
    async (
      {editorA, keyMap}: Context,
      text: string,
      annotation: 'comment' | 'link',
      keyKey: string,
    ) => {
      await selectEditorText(editorA, text)
      const key = await toggleAnnotation(editorA, annotation)
      keyMap.set(keyKey, key)
    },
  ),
  When(
    '{string} is marked with {decorator}',
    async ({editorA}: Context, text: string, decorator: 'em' | 'strong') => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  Given(
    '{decorator} around {string}',
    async ({editorA}: Context, decorator: 'em' | 'strong', text: string) => {
      await selectEditorText(editorA, text)
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  When(
    '{decorator} is toggled using the keyboard',
    async ({editorA}: Context, decorator: 'em' | 'strong') => {
      await editorA.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  Then(
    '{string} has marks {marks}',
    async ({editorA, keyMap}: Context, text: string, marks: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((actualMarks) => {
        expect(actualMarks).toEqual(
          marks.flatMap((mark) =>
            mark === 'em' || mark === 'strong'
              ? [mark]
              : (keyMap.get(mark) ?? [mark]),
          ),
        )
      })
    },
  ),
  Then('{string} has no marks', async ({editorA}: Context, text: string) => {
    await getEditorTextMarks(editorA, text).then((marks) =>
      expect(marks).toEqual([]),
    )
  }),

  /**
   * Selection steps
   */
  When('{string} is selected', async ({editorA}: Context, text: string) => {
    if (text === 'stock-ticker') {
      await selectEditorInlineObject(editorA, text)
    } else {
      await selectEditorText(editorA, text)
    }
  }),
  When(
    '{string} is selected backwards',
    async ({editorA}: Context, text: string) => {
      await selectEditorTextBackwards(editorA, text)
    },
  ),
  When(
    'the caret is put before {string}',
    async ({editorA}: Context, text: string) => {
      if (text === 'stock-ticker') {
        await selectBeforeEditorInlineObject(editorA, text)
      } else {
        await selectBeforeEditorText(editorA, text)
      }
    },
  ),
  When(
    'the caret is put before {string} by editor B',
    async ({editorB}: Context, text: string) => {
      if (text === 'stock-ticker') {
        await selectBeforeEditorInlineObject(editorB, text)
      } else {
        await selectBeforeEditorText(editorB, text)
      }
    },
  ),
  When(
    'the caret is put after {string}',
    async ({editorA}: Context, text: string) => {
      if (text === 'stock-ticker') {
        await selectAfterEditorInlineObject(editorA, text)
      } else {
        await selectAfterEditorText(editorA, text)
      }
    },
  ),
  When(
    'the caret is put after {string} by editor B',
    async ({editorB}: Context, text: string) => {
      if (text === 'stock-ticker') {
        await selectAfterEditorInlineObject(editorB, text)
      } else {
        await selectAfterEditorText(editorB, text)
      }
    },
  ),
  Then(
    '{text} is selected',
    async ({editorA}: Context, text: Array<string>) => {
      const value = await editorA.getValue()
      const selection = await editorA.getSelection()

      expect(getSelectionText(value, selection)).toEqual(text)
    },
  ),
  Then(
    'block {key} is selected',
    async ({editorA, keyMap}: Context, keyKey: string) => {
      await editorA.getSelection().then((selection) => {
        const selectionBlockKeys = getSelectionBlockKeys(selection)

        expect(selectionBlockKeys?.anchor).toEqual(keyMap.get(keyKey))
        expect(selectionBlockKeys?.focus).toEqual(keyMap.get(keyKey))
      })
    },
  ),
  Then(
    'the caret is before {string}',
    async ({editorA}: Context, text: string) => {
      const value = await editorA.getValue()
      const selection = await editorA.getSelection()

      const collapsed = selectionIsCollapsed(selection)
      const focusText = getSelectionFocusText(value, selection)

      expect(collapsed).toBe(true)
      expect(focusText?.slice(selection?.focus.offset)).toBe(text)
    },
  ),
  Then(
    'the caret is after {string}',
    async ({editorA}: Context, text: string) => {
      const value = await editorA.getValue()
      const selection = await editorA.getSelection()

      const collapsed = selectionIsCollapsed(selection)
      const focusText = getSelectionFocusText(value, selection)

      expect(collapsed).toBe(true)
      expect(focusText?.slice(0, selection?.focus.offset)).toBe(text)
    },
  ),

  /**
   * Button steps
   */
  When('{button} is pressed', async ({editorA}: Context, button: string) => {
    await editorA.pressKey(button)
  }),
  When(
    '{button} is pressed by editor B',
    async ({editorB}: Context, button: string) => {
      await editorB.pressKey(button)
    },
  ),
  When(
    '{button} is pressed with navigation intent',
    async ({editorA}: Context, button: string) => {
      await editorA.pressKey(button, 1, 'navigation')
    },
  ),
  When(
    '{button} is pressed {int} times',
    async ({editorA}: Context, button: string, times: number) => {
      await editorA.pressKey(button, times)
    },
  ),

  /**
   * Undo/redo steps
   */
  When('undo is performed', async ({editorA}: Context) => {
    await editorA.undo()
  }),
  When('redo is performed', async ({editorA}: Context) => {
    await editorA.redo()
  }),
]

export const parameterTypes = [
  new ParameterType(
    'annotation',
    /"(comment|link)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  new ParameterType(
    'block-object',
    /"(image)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  new ParameterType(
    'inline-object',
    /"(stock-ticker)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  new ParameterType(
    'button',
    /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space)"/,
    String,
    (input) => (input === 'Space' ? ' ' : input),
    false,
    true,
  ),
  new ParameterType(
    'key',
    /"([a-z]\d)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  new ParameterType(
    'keys',
    /"(([a-z]\d)(,([a-z]\d))*)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  new ParameterType(
    'decorator',
    /"(em|strong)"/,
    String,
    (input) => input,
    false,
    true,
  ),
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
