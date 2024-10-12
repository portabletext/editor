import {expect} from '@jest/globals'
import {Given, Then, When} from '@sanity/gherkin-driver'
import {
  getAnnotations,
  getBlockKey,
  getBlockKeys,
  getEditorSelection,
  getInlineObjectSelection,
  getSelectionBlockKeys,
  getSelectionFocusText,
  getSelectionText,
  getTextMarks,
  getTextSelection,
  getValueText,
  reverseTextSelection,
  selectionIsCollapsed,
} from '../../gherkin-spec/gherkin-step-helpers'
import type {Editor} from '../setup/globals.jest'

type Context = {
  editorA: Editor
  editorB: Editor
  keyMap: Map<string, string>
}

export const stepDefinitions = [
  /**
   * Background steps
   */
  Given<Context>('a global keymap', async (context) => {
    context.keyMap = new Map()
  }),

  Given<Context>('one editor', async (context) => {
    const editor = await getEditor()
    context.editorA = editor
  }),

  Given<Context>('two editors', async (context) => {
    const [editorA, editorB] = await getEditors()
    context.editorA = editorA
    context.editorB = editorB
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
      const value = await editorA.getValue()
      const selection = await editorA.getSelection()
      const selectionFocusText = getSelectionFocusText(value, selection)

      // Slightly naive way to figure out if we need to put the text in a new block
      if (selectionFocusText !== undefined) {
        await editorA.pressKey('Enter')
      }

      const newBlockKey = await insertEditorText(editorA, text)

      keyMap.set(keyKey, newBlockKey)
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

      if (newBlockKeys.length === 0) {
        throw new Error('No new block key was added')
      }

      if (newBlockKeys.length > 1) {
        throw new Error(
          `More than one new block key was added: ${JSON.stringify(newBlockKeys)}`,
        )
      }

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

      const newAnnotationKeys = await toggleAnnotation(editorA, annotation)

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      keyMap.set(keyKey, newAnnotationKeys[0])
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

      const newAnnotationKeys = await toggleAnnotation(editorB, annotation)

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      keyMap.set(keyKey, newAnnotationKeys[0])
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
      const newAnnotationKeys = await toggleAnnotation(editorA, annotation)

      if (newAnnotationKeys.length !== keyKeys.length) {
        throw new Error(
          `Expected ${keyKeys.length} new annotation keys, but got ${newAnnotationKeys.length}`,
        )
      }

      keyKeys.forEach((keyKey, index) => {
        keyMap.set(keyKey, newAnnotationKeys[index])
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

      const newAnnotationKeys = await toggleAnnotation(editorA, annotation)

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      keyMap.set(keyKey, newAnnotationKeys[0])
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
  When(
    '{decorator} is toggled using the keyboard by editor B',
    async ({editorB}: Context, decorator: 'em' | 'strong') => {
      await editorB.toggleDecoratorUsingKeyboard(decorator)
    },
  ),
  Then(
    '{string} has marks {marks}',
    async ({editorA, keyMap}: Context, text: string, marks: Array<string>) => {
      await getEditorTextMarks(editorA, text).then((actualMarks) => {
        expect(actualMarks).toEqual(
          marks.map((mark) =>
            mark === 'em' || mark === 'strong'
              ? mark
              : (keyMap.get(mark) ?? mark),
          ),
        )
      })
    },
  ),
  Then(
    '{string} has an annotation different than {key}',
    async ({editorA, keyMap}: Context, text: string, key: string) => {
      await getEditorTextMarks(editorA, text).then((marks) => {
        const annotations =
          marks?.filter((mark) => mark !== 'em' && mark !== 'strong') ?? []

        expect(annotations.length).toBeGreaterThan(0)
        expect(
          annotations.some((annotation) => annotation === keyMap.get(key)),
        ).toBeFalsy()
      })
    },
  ),
  Then(
    '{string} and {string} have the same marks',
    async ({editorA}: Context, textA: string, textB: string) => {
      const marksA = await getEditorTextMarks(editorA, textA)
      const marksB = await getEditorTextMarks(editorA, textB)

      expect(marksA).toEqual(marksB)
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
  When('everything is selected', async ({editorA}: Context) => {
    await selectEditor(editorA)
  }),
  When('everything is selected backwards', async ({editorA}: Context) => {
    await selectEditorBackwards(editorA)
  }),
  When('{string} is selected', async ({editorA}: Context, text: string) => {
    if (text === 'stock-ticker') {
      await selectEditorInlineObject(editorA, text)
    } else {
      await selectEditorText(editorA, text)
    }
  }),
  When(
    '{string} is selected by editor B',
    async ({editorB}: Context, text: string) => {
      if (text === 'stock-ticker') {
        await selectEditorInlineObject(editorB, text)
      } else {
        await selectEditorText(editorB, text)
      }
    },
  ),
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
  When(
    '{button} is pressed {int} times by editor B',
    async ({editorB}: Context, button: string, times: number) => {
      await editorB.pressKey(button, times)
    },
  ),

  /**
   * Undo/redo steps
   */
  When('undo is performed', async ({editorA}: Context) => {
    await editorA.undo()
  }),
  When('undo is performed by editor B', async ({editorB}: Context) => {
    await editorB.undo()
  }),
  When('redo is performed', async ({editorA}: Context) => {
    await editorA.redo()
  }),
]

/********************
 * Step helpers
 ********************/

async function getEditorBlockKey(editor: Editor, text: string) {
  return editor.getValue().then((value) => getBlockKey(value, text))
}

function getEditorText(editor: Editor) {
  return editor.getValue().then(getValueText)
}

async function insertEditorText(editor: Editor, text: string) {
  await editor.insertText(text)
  const value = await editor.getValue()

  return getBlockKey(value, text)
}

async function insertBlockObject(editor: Editor, name: 'image') {
  return getNewBlockKeys(editor, async () => {
    await editor.pressButton(`insert-${name}`)
  })
}

async function getNewBlockKeys(editor: Editor, step: () => Promise<void>) {
  const value = await editor.getValue()
  const blockKeysBefore = getBlockKeys(value)

  await step()

  const newValue = await editor.getValue()

  return getBlockKeys(newValue).filter(
    (blockKey) => !blockKeysBefore.includes(blockKey),
  )
}

function getEditorTextMarks(editor: Editor, text: string) {
  return editor.getValue().then((value) => getTextMarks(value, text))
}

function toggleAnnotation(editor: Editor, annotation: 'comment' | 'link') {
  return getNewAnnotations(editor, async () => {
    await editor.toggleAnnotation(annotation)
  })
}

async function getNewAnnotations(editor: Editor, step: () => Promise<void>) {
  const value = await editor.getValue()
  const annotationsBefore = getAnnotations(value)

  await step()

  const newValue = await editor.getValue()

  return getAnnotations(newValue).filter(
    (annotation) => !annotationsBefore.includes(annotation),
  )
}

function selectEditorInlineObject(editor: Editor, inlineObjectName: string) {
  return editor
    .getValue()
    .then((value) => getInlineObjectSelection(value, inlineObjectName))
    .then(editor.setSelection)
}

function selectBeforeEditorInlineObject(
  editor: Editor,
  inlineObjectName: string,
) {
  return selectEditorInlineObject(editor, inlineObjectName).then(() =>
    editor.pressKey('ArrowLeft'),
  )
}

function selectAfterEditorInlineObject(
  editor: Editor,
  inlineObjectName: string,
) {
  return selectEditorInlineObject(editor, inlineObjectName).then(() =>
    editor.pressKey('ArrowRight'),
  )
}

function selectEditor(editor: Editor) {
  return editor.getValue().then(getEditorSelection).then(editor.setSelection)
}

function selectEditorBackwards(editor: Editor) {
  return editor
    .getValue()
    .then(getEditorSelection)
    .then(reverseTextSelection)
    .then(editor.setSelection)
}

function selectEditorText(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(editor.setSelection)
}

function selectEditorTextBackwards(editor: Editor, text: string) {
  return editor
    .getValue()
    .then((value) => getTextSelection(value, text))
    .then(reverseTextSelection)
    .then(editor.setSelection)
}

export function selectBeforeEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() => editor.pressKey('ArrowLeft'))
}

export function selectAfterEditorText(editor: Editor, text: string) {
  return selectEditorText(editor, text).then(() =>
    editor.pressKey('ArrowRight'),
  )
}
