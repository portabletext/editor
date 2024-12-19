import {isPortableTextBlock} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import {page, userEvent, type Locator} from '@vitest/browser/context'
import {isEqual} from 'lodash'
import {Given, Then, When} from 'racejar'
import {assert, expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {createActor} from 'xstate'
import type {EditorSelection} from '../src'
import {Editors} from './editors'
import {
  getAnnotations,
  getBlockKey,
  getBlockKeys,
  getEditorSelection,
  getInlineObjectSelection,
  getSelectionAfterInlineObject,
  getSelectionAfterText,
  getSelectionBeforeInlineObject,
  getSelectionBeforeText,
  getSelectionBlockKeys,
  getSelectionFocusText,
  getSelectionText,
  getTextMarks,
  getTextSelection,
  getValueText,
  reverseTextSelection,
  selectionIsCollapsed,
} from './gherkin-step-helpers'
import {schema} from './schema'
import {
  testMachine,
  type EditorActorRef,
  type TestActorRef,
} from './test-machine'

export type EditorContext = {
  locator: Locator
  insertObjectButtonLocator: {
    image: Locator
  }
  insertInlineObjectButtonLocator: {
    'stock-ticker': Locator
  }
  selectionLocator: Locator
  toggleAnnotationButtonLocator: {
    comment: Locator
    link: Locator
  }
  toggleStyleButtonLocator: (style: 'normal' | `h${number}`) => Locator
  ref: EditorActorRef
}

export function createEditorContext({
  ref,
  locator,
}: {
  ref: EditorActorRef
  locator: Locator
}): EditorContext {
  return {
    ref,
    locator: locator.getByRole('textbox'),
    insertObjectButtonLocator: {
      image: locator.getByTestId('button-insert-image'),
    },
    insertInlineObjectButtonLocator: {
      'stock-ticker': locator.getByTestId('button-insert-stock-ticker'),
    },
    selectionLocator: locator.getByTestId('selection'),
    toggleAnnotationButtonLocator: {
      comment: locator.getByTestId('button-toggle-comment'),
      link: locator.getByTestId('button-toggle-link'),
    },
    toggleStyleButtonLocator: (style) =>
      locator.getByTestId(`button-toggle-style-${style}`),
  }
}

export type Context = {
  testRef: TestActorRef
  editorA: EditorContext
  editorB: EditorContext
  keyMap: Map<string, string>
}

export const stepDefinitions = [
  /**
   * Background steps
   */
  Given('one editor', async (context: Context) => {
    const testActor = createActor(testMachine, {
      input: {
        schema,
        value: undefined,
      },
    })
    testActor.start()
    testActor.send({type: 'add editor'})

    render(<Editors testRef={testActor} />)

    const editorARef = testActor.getSnapshot().context.editors[0]
    const locator = page.getByTestId(editorARef.id)

    context.testRef = testActor
    context.editorA = createEditorContext({ref: editorARef, locator})

    await vi.waitFor(async () => {
      await expect.element(context.editorA.locator).toBeInTheDocument()
    })
  }),
  Given('two editors', async (context: Context) => {
    const testActor = createActor(testMachine, {
      input: {
        behaviors: [],
        schema,
        value: undefined,
      },
    })
    testActor.start()
    testActor.send({type: 'add editor'})
    testActor.send({type: 'add editor'})

    render(<Editors testRef={testActor} />)

    const editorARef = testActor.getSnapshot().context.editors[0]
    const editorALocator = page.getByTestId(editorARef.id)

    context.testRef = testActor
    context.editorA = createEditorContext({
      ref: editorARef,
      locator: editorALocator,
    })

    const editorBRef = testActor.getSnapshot().context.editors[1]
    const editorBLocator = page.getByTestId(editorBRef.id)

    context.editorB = createEditorContext({
      ref: editorBRef,
      locator: editorBLocator,
    })

    await vi.waitFor(async () => {
      await expect.element(context.editorA.locator).toBeInTheDocument()
      await expect.element(context.editorB.locator).toBeInTheDocument()
    })
  }),
  Given('a global keymap', (context: Context) => {
    context.keyMap = new Map()
  }),

  /**
   * Editor steps
   */
  Given('an empty editor', async () => {
    // noop
  }),
  When('editors have settled', async () => {
    await waitForNewValue(() => Promise.resolve())
  }),
  Then('the editor is empty', async () => {
    await getValue().then((value) =>
      expect(value ?? [], 'The editor is not empty').toEqual([]),
    )
  }),

  /**
   * Text steps
   */
  Given('the text {string}', async (context: Context, text: string) => {
    await waitForNewValue(async () => {
      await userEvent.click(context.editorA.locator)
      await userEvent.type(context.editorA.locator, text)
    })
  }),
  Then('the text is {text}', async (_: Context, text: Array<string>) => {
    await expectText(text)
  }),

  /**
   * Object steps
   */
  Given(
    'a(n) {block-object}',
    async (context: Context, blockObject: 'image') => {
      await waitForNewValue(() =>
        context.editorA.insertObjectButtonLocator[blockObject].click(),
      )
    },
  ),
  Given(
    'a(n) {block-object} {key}',
    async (context: Context, blockObject: 'image', keyKey: string) => {
      const newBlockKeys = await getNewBlockKeys(
        async () =>
          await waitForNewValue(async () => {
            await context.editorA.insertObjectButtonLocator[blockObject].click()
          }),
      )

      if (newBlockKeys.length === 0) {
        assert.fail('No new block key was added')
      }

      if (newBlockKeys.length > 1) {
        assert.fail(
          `More than one new block key was added: ${JSON.stringify(newBlockKeys)}`,
        )
      }

      context.keyMap.set(keyKey, newBlockKeys[0])
    },
  ),
  Given(
    'a(n) {inline-object}',
    async (context: Context, inlineObject: 'stock-ticker') => {
      await context.editorA.locator.click()
      await waitForNewValue(() =>
        context.editorA.insertInlineObjectButtonLocator[inlineObject].click(),
      )
    },
  ),

  /**
   * Mark steps
   */
  Given(
    'a(n) {annotation} {key} around {string}',
    async (
      context: Context,
      annotation: 'comment' | 'link',
      keyKey: string,
      text: string,
    ) => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        await context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })
      const newAnnotationKeys = await toggleAnnotation(
        context.editorA,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        assert.fail('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        assert.fail(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      context.keyMap.set(keyKey, newAnnotationKeys[0])
    },
  ),
  Given(
    'a(n) {annotation} {key} around {string} by editor B',
    async (
      context: Context,
      annotation: 'comment' | 'link',
      keyKey: string,
      text: string,
    ) => {
      const value = await getValue()

      await waitForNewSelection(context.editorB, async () => {
        await context.editorB.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })

      const newAnnotationKeys = await toggleAnnotation(
        context.editorB,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        assert.fail('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        assert.fail(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      context.keyMap.set(keyKey, newAnnotationKeys[0])
    },
  ),
  When(
    '{annotation} is toggled',
    async (context: Context, annotation: 'comment' | 'link') => {
      await toggleAnnotation(context.editorA, annotation)
    },
  ),
  When(
    '{annotation} {keys} is toggled',
    async (
      context: Context,
      annotation: 'comment' | 'link',
      keyKeys: Array<string>,
    ) => {
      const newAnnotationKeys = await toggleAnnotation(
        context.editorA,
        annotation,
      )

      if (newAnnotationKeys.length !== keyKeys.length) {
        assert.fail(
          `Expected ${keyKeys.length} new annotation keys, but got ${newAnnotationKeys.length}`,
        )
      }

      keyKeys.forEach((keyKey, index) => {
        context.keyMap.set(keyKey, newAnnotationKeys[index])
      })
    },
  ),
  When(
    '{string} is marked with a(n) {annotation} {key}',
    async (
      context: Context,
      text: string,
      annotation: 'comment' | 'link',
      keyKey: string,
    ) => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        await context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })

      const newAnnotationKeys = await toggleAnnotation(
        context.editorA,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        assert.fail('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        assert.fail(
          `More than one new annotation key was added: ${JSON.stringify(newAnnotationKeys)}`,
        )
      }

      context.keyMap.set(keyKey, newAnnotationKeys[0])
    },
  ),
  When(
    '{string} is marked with {decorator}',
    async (context: Context, text: string, decorator: 'em' | 'strong') => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        await context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })
      await waitForNewValue(() => toggleDecoratorUsingKeyboard(decorator))
    },
  ),
  Given(
    '{decorator} around {string}',
    async (context: Context, decorator: 'em' | 'strong', text: string) => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        await context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })
      await waitForNewValue(() => toggleDecoratorUsingKeyboard(decorator))
    },
  ),
  When(
    '{decorator} is toggled using the keyboard',
    async (context: Context, decorator: 'em' | 'strong') => {
      const selection = await getSelection(context.editorA)

      if (!selection) {
        await waitForNewSelection(context.editorA, () =>
          userEvent.click(context.editorA.locator),
        )
        return toggleDecoratorUsingKeyboard(decorator)
      }

      if (selection && isEqual(selection.anchor, selection.focus)) {
        return toggleDecoratorUsingKeyboard(decorator)
      }

      await waitForNewValue(() => toggleDecoratorUsingKeyboard(decorator))
    },
  ),
  When(
    '{decorator} is toggled using the keyboard by editor B',
    async (context: Context, decorator: 'em' | 'strong') => {
      const selection = await getSelection(context.editorB)

      if (!selection) {
        await waitForNewSelection(context.editorB, () =>
          userEvent.click(context.editorB.locator),
        )
        return toggleDecoratorUsingKeyboard(decorator)
      }

      if (selection && isEqual(selection.anchor, selection.focus)) {
        return toggleDecoratorUsingKeyboard(decorator)
      }

      await waitForNewValue(() => toggleDecoratorUsingKeyboard(decorator))
    },
  ),
  Then(
    '{string} has marks {marks}',
    async (context: Context, text: string, marks: Array<string>) => {
      await getEditorTextMarks(text).then((actualMarks) => {
        const expectedMarks = marks.map((mark) =>
          mark === 'em' || mark === 'strong'
            ? mark
            : (context.keyMap.get(mark) ?? mark),
        )

        if (!isEqual(actualMarks, expectedMarks)) {
          assert.fail(
            `Expected "${text}" to have marks [${expectedMarks}] but received [${actualMarks}]`,
          )
        }
      })
    },
  ),
  Then(
    '{string} has an annotation different than {key}',
    async (context: Context, text: string, key: string) => {
      await getEditorTextMarks(text).then((marks) => {
        const annotations =
          marks?.filter((mark) => mark !== 'em' && mark !== 'strong') ?? []

        expect(
          annotations.length,
          `Expected at least one annotation for "${text}"`,
        ).toBeGreaterThan(0)
        expect(
          annotations.some(
            (annotation) => annotation === context.keyMap.get(key),
          ),
          `Expected "${text}" to not have annotation ${key}`,
        ).toBeFalsy()
      })
    },
  ),
  Then(
    '{string} and {string} have the same marks',
    async (_: Context, textA: string, textB: string) => {
      const marksA = await getEditorTextMarks(textA)
      const marksB = await getEditorTextMarks(textB)

      expect(
        marksA,
        `Expected "${textA}" and "${textB}" to have the same marks`,
      ).toEqual(marksB)
    },
  ),
  Then('{string} has no marks', async (_: Context, text: string) => {
    await getEditorTextMarks(text).then((marks) =>
      expect(marks, `Expected "${text} to have no marks"`).toEqual([]),
    )
  }),

  /**
   * Selection steps
   */
  When('everything is selected', async (context: Context) => {
    await waitForNewSelection(context.editorA, async () => {
      const value = await getValue()
      const selection = await getEditorSelection(value)

      context.editorA.ref.send({
        type: 'selection',
        selection,
      })
    })
  }),
  When('everything is selected backwards', async (context: Context) => {
    await waitForNewSelection(context.editorA, async () => {
      const value = await getValue()
      const selection = await getEditorSelection(value)

      context.editorA.ref.send({
        type: 'selection',
        selection: reverseTextSelection(selection),
      })
    })
  }),
  When('{string} is selected', async (context: Context, text: string) => {
    const value = await getValue()

    await waitForNewSelection(context.editorA, async () => {
      if (text === '[stock-ticker]') {
        await context.editorA.ref.send({
          type: 'selection',
          selection: getInlineObjectSelection(
            value,
            text.replace('[', '').replace(']', ''),
          ),
        })
      } else {
        context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      }
    })
  }),
  When(
    '{string} is selected by editor B',
    async (context: Context, text: string) => {
      const value = await getValue()

      await waitForNewSelection(context.editorB, async () => {
        if (text === '[stock-ticker]') {
          await context.editorB.ref.send({
            type: 'selection',
            selection: getInlineObjectSelection(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        } else {
          await context.editorB.ref.send({
            type: 'selection',
            selection: getTextSelection(value, text),
          })
        }
      })
    },
  ),
  When(
    '{string} is selected backwards',
    async (context: Context, text: string) => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        await context.editorA.ref.send({
          type: 'selection',
          selection: reverseTextSelection(getTextSelection(value, text)),
        })
      })
    },
  ),
  When(
    'the caret is put before {string}',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorA, async () => {
          await context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionBeforeInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await putCaretBeforeText(context.editorA, text)
      }
    },
  ),
  When(
    'the caret is put before {string} by editor B',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorB, async () => {
          await context.editorB.ref.send({
            type: 'selection',
            selection: getSelectionBeforeInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await putCaretBeforeText(context.editorB, text)
      }
    },
  ),
  When(
    'the caret is put after {string}',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorA, async () => {
          await context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionAfterInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await putCaretAfterText(context.editorA, text)
      }
    },
  ),
  When(
    'the caret is put after {string} by editor B',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorB, async () => {
          await context.editorB.ref.send({
            type: 'selection',
            selection: getSelectionAfterInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await putCaretAfterText(context.editorB, text)
      }
    },
  ),
  Then(
    'the caret is before {string}',
    async (context: Context, text: string) => {
      const value = await getValue()
      const selection = await getSelection(context.editorA)

      const collapsed = selectionIsCollapsed(selection)
      const focusText = getSelectionFocusText(value, selection)

      expect(collapsed, 'Selection is not collapsed').toBe(true)
      expect(
        focusText?.slice(selection?.focus.offset),
        'Unexpected focus text',
      ).toBe(text)
    },
  ),
  Then(
    'the caret is after {string}',
    async (context: Context, text: string) => {
      const value = await getValue()
      const selection = await getSelection(context.editorA)

      const collapsed = selectionIsCollapsed(selection)
      const focusText = getSelectionFocusText(value, selection)

      expect(collapsed, 'Selection is not collapsed').toBe(true)
      expect(
        focusText?.slice(0, selection?.focus.offset),
        'Unexpected focus text',
      ).toBe(text)
    },
  ),
  Then('{text} is selected', async (context: Context, text: Array<string>) => {
    const value = await getValue()
    const selection = await getSelection(context.editorA)

    expect(getSelectionText(value, selection), 'Unexpected selection').toEqual(
      text,
    )
  }),
  Then('block {key} is selected', async (context: Context, keyKey: string) => {
    await getSelection(context.editorA).then((selection) => {
      const selectionBlockKeys = getSelectionBlockKeys(selection)

      expect(
        selectionBlockKeys?.anchor,
        'Unexpected selection anchor block key',
      ).toBe(context.keyMap.get(keyKey))
      expect(
        selectionBlockKeys?.focus,
        'Unexpected selectoin focus block key',
      ).toBe(context.keyMap.get(keyKey))
    })
  }),

  /**
   * Style steps
   */
  When(
    '{style} is toggled',
    async (context: Context, style: 'normal' | `h${number}`) => {
      await waitForNewValue(async () =>
        context.editorA.toggleStyleButtonLocator(style).click(),
      )
    },
  ),
  Then(
    'block {index} has style {style}',
    async (_context: Context, index: number, style: 'h1' | 'normal') => {
      const value = await getValue()
      const block = value ? value[index] : undefined

      if (!block || !isPortableTextBlock(block)) {
        assert.fail(`Unable to find text block at index ${index}`)
      }

      expect(block.style, `Unexpected marks for block ${index}`).toBe(style)
    },
  ),

  /**
   * Typing steps
   */
  When('{string} is typed', async (context: Context, text: string) => {
    await type(context.editorA, text)
  }),
  When(
    '{string} is typed by editor B',
    async (context: Context, text: string) => {
      await type(context.editorB, text)
    },
  ),

  /**
   * Text block steps
   */
  Given(
    'the text {string} in block {key}',
    async (context: Context, text: string, keyKey: string) => {
      const value = await getValue()
      const selection = await getSelection(context.editorA)
      const selectionFocusText = getSelectionFocusText(value, selection)

      // Slightly naive way to figure out if we need to put the text in a new block
      if (selectionFocusText !== undefined) {
        await pressButton(context.editorA, 'Enter', 1)
      }

      await waitForNewValue(async () => {
        await userEvent.type(context.editorA.locator, text)
      })
      const newValue = await getValue()
      const newBlockKey = await getBlockKey(newValue, text)

      context.keyMap.set(keyKey, newBlockKey)
    },
  ),
  Then(
    '{text} is in block {key}',
    async (context: Context, text: Array<string>, keyKey: string) => {
      if (text.length === 0) {
        assert.fail(`No block to find a key for: ${text}`)
      }

      if (text.length > 1) {
        assert.fail(`Unable to find key for multiple blocks: ${text}`)
      }

      const value = await getValue()

      expect(
        getBlockKey(value, text[0]),
        `"${text}" ("${text[0]}") is in an unexpected block`,
      ).toBe(context.keyMap.get(keyKey))
    },
  ),

  /**
   * Button steps
   */
  When('{button} is pressed', async (context: Context, button: ButtonName) => {
    await pressButton(context.editorA, button, 1)
  }),
  When(
    '{button} is pressed by editor B',
    async (context: Context, button: ButtonName) => {
      context.editorB.ref.send({type: 'focus'})
      await pressButton(context.editorB, button, 1)
    },
  ),
  When(
    '{button} is pressed {int} times',
    async (context: Context, button: ButtonName, times: number) => {
      await pressButton(context.editorA, button, times)
    },
  ),
  When(
    '{button} is pressed {int} times by editor B',
    async (context: Context, button: ButtonName, times: number) => {
      context.editorB.ref.send({type: 'focus'})
      await pressButton(context.editorB, button, times)
    },
  ),

  /**
   * Undo/redo steps
   */
  When('undo is performed', async (context: Context) => {
    await undo(context.editorA)
  }),
  When('undo is performed by editor B', async (context: Context) => {
    await undo(context.editorB)
  }),
  When('redo is performed', async (context: Context) => {
    await redo(context.editorA)
  }),
]

function getMetaKey() {
  const userAgent = navigator.userAgent
  const isMac = /Mac|iPod|iPhone|iPad/.test(userAgent)
  const metaKey = isMac ? 'Meta' : 'Control'

  return metaKey
}

async function toggleDecoratorUsingKeyboard(decorator: 'em' | 'strong') {
  await userEvent.keyboard(
    `{${getMetaKey()}>}${decorator === 'em' ? 'i' : 'b'}{/${getMetaKey()}}`,
  )
}

async function toggleAnnotation(
  editor: EditorContext,
  annotation: 'comment' | 'link',
) {
  return getNewAnnotations(() =>
    waitForNewValue(async () =>
      editor.toggleAnnotationButtonLocator[annotation].click(),
    ),
  )
}

async function getNewAnnotations(step: () => Promise<unknown>) {
  const value = await getValue()
  const annotationsBefore = getAnnotations(value)

  await step()

  const newValue = await getValue()

  return getAnnotations(newValue).filter(
    (annotation) => !annotationsBefore.includes(annotation),
  )
}

async function getNewBlockKeys(step: () => Promise<unknown>) {
  const value = await getValue()
  const blockKeysBefore = getBlockKeys(value)

  await step()

  const newValue = await getValue()

  return getBlockKeys(newValue).filter(
    (blockKey) => !blockKeysBefore.includes(blockKey),
  )
}

type ButtonName =
  | `Arrow${'Up' | 'Right' | 'Down' | 'Left'}`
  | 'Backspace'
  | 'Delete'
  | 'Enter'
  | 'Shift+Enter'
  | 'Space'
export async function pressButton(
  editor: EditorContext,
  button: ButtonName,
  times: number,
) {
  if (button === 'Backspace' || button === 'Delete' || button === 'Enter') {
    return waitForNewValue(async () => {
      for (let i = 0; i < times; i++) {
        await userEvent.keyboard(`{${button}}`)
      }
    })
  }

  if (button === 'Shift+Enter') {
    return waitForNewValue(async () => {
      for (let i = 0; i < times; i++) {
        await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
      }
    })
  }

  if (button === 'Space') {
    return waitForNewValue(async () => {
      for (let i = 0; i < times; i++) {
        await userEvent.type(editor.locator, ' ')
      }
    })
  }

  return await waitForNewSelection(editor, async () => {
    for (let i = 0; i < times; i++) {
      await userEvent.keyboard(`{${button}}`)
    }
  })
}

function getEditorTextMarks(text: string) {
  return getValue().then((value) => getTextMarks(value, text))
}

export async function getValue(): Promise<
  Array<PortableTextBlock> | undefined
> {
  const valueLocator = await page.getByTestId('value')
  const valueNode = await valueLocator.query()

  const value =
    valueNode instanceof HTMLElement && valueNode.innerText
      ? JSON.parse(valueNode.innerText)
      : undefined
  return value
}

export const waitForNewValue = async (changeFn: () => Promise<void>) => {
  const oldValue = await getValue()
  await changeFn()
  return vi.waitFor(async () => {
    const newValue = await getValue()
    expect(oldValue).not.toEqual(newValue)
    return newValue
  })
}

async function getSelection(editor: EditorContext): Promise<EditorSelection> {
  const selectionNode = await editor.selectionLocator.query()
  const selection =
    selectionNode instanceof HTMLElement && selectionNode.innerText
      ? JSON.parse(selectionNode.innerText)
      : null
  return selection
}

export const waitForNewSelection = async (
  _editor: EditorContext,
  changeFn: () => Promise<void>,
) => {
  await changeFn()
  await new Promise((resolve) => setTimeout(resolve, 100))
}

export async function putCaretBeforeText(editor: EditorContext, text: string) {
  const value = await getValue()

  await waitForNewSelection(editor, async () => {
    await editor.ref.send({
      type: 'selection',
      selection: getSelectionBeforeText(value, text),
    })
  })
}

export async function putCaretAfterText(editor: EditorContext, text: string) {
  const value = await getValue()

  await waitForNewSelection(editor, async () => {
    await editor.ref.send({
      type: 'selection',
      selection: getSelectionAfterText(value, text),
    })
  })
}

export async function type(editor: EditorContext, text: string) {
  await waitForNewValue(async () => {
    editor.ref.send({type: 'focus'})
    await userEvent.type(editor.locator, text)
  })
}

export async function undo(editor: EditorContext) {
  await waitForNewValue(async () => {
    editor.ref.send({type: 'focus'})
    await userEvent.keyboard(`{${getMetaKey()}>}z{/${getMetaKey()}}`)
  })
}

export async function redo(editor: EditorContext) {
  await waitForNewValue(async () => {
    editor.ref.send({type: 'focus'})
    await userEvent.keyboard(
      `{Shift>}{${getMetaKey()}>}z{/${getMetaKey()}}{/Shift}`,
    )
  })
}

export async function expectText(text: Array<string>) {
  await vi.waitFor(() =>
    getValue()
      .then(getValueText)
      .then((actualText) => {
        expect(actualText, 'Unexpected editor text').toEqual(text)
      }),
  )
}
