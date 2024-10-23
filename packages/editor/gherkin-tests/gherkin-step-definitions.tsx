import {isPortableTextBlock} from '@portabletext/toolkit'
import {Given, Then, When} from '@sanity/gherkin-driver'
import type {PortableTextBlock} from '@sanity/types'
import {page, userEvent, type Locator} from '@vitest/browser/context'
import {isEqual} from 'lodash'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {createActor} from 'xstate'
import {schema} from '../e2e-tests/schema'
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
import {testMachine, type EditorActorRef} from './test-machine'

type EditorContext = {
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
  toggleStyleButtonLocator: {
    normal: Locator
    h1: Locator
  }
  ref: EditorActorRef
}

type Context = {
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
      input: {schema, value: undefined},
    })
    testActor.start()
    testActor.send({type: 'add editor'})

    render(<Editors testRef={testActor} />)

    const editorARef = testActor.getSnapshot().context.editors[0]
    const locator = page.getByTestId(editorARef.id)

    context.editorA = {
      ref: editorARef,
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
      toggleStyleButtonLocator: {
        normal: locator.getByTestId('button-toggle-style-normal'),
        h1: locator.getByTestId('button-toggle-style-h1'),
      },
    }

    vi.waitFor(async () => {
      await expect.element(context.editorA.locator).toBeInTheDocument()
    })
  }),
  Given('two editors', async (context: Context) => {
    const testActor = createActor(testMachine, {
      input: {schema, value: undefined},
    })
    testActor.start()
    testActor.send({type: 'add editor'})
    testActor.send({type: 'add editor'})

    render(<Editors testRef={testActor} />)

    const editorARef = testActor.getSnapshot().context.editors[0]
    const editorALocator = page.getByTestId(editorARef.id)

    context.editorA = {
      ref: editorARef,
      locator: editorALocator.getByRole('textbox'),
      insertObjectButtonLocator: {
        image: editorALocator.getByTestId('button-insert-image'),
      },
      insertInlineObjectButtonLocator: {
        'stock-ticker': editorALocator.getByTestId(
          'button-insert-stock-ticker',
        ),
      },
      selectionLocator: editorALocator.getByTestId('selection'),
      toggleAnnotationButtonLocator: {
        comment: editorALocator.getByTestId('button-toggle-comment'),
        link: editorALocator.getByTestId('button-toggle-link'),
      },
      toggleStyleButtonLocator: {
        normal: editorALocator.getByTestId('button-toggle-style-normal'),
        h1: editorALocator.getByTestId('button-toggle-style-h1'),
      },
    }

    const editorBRef = testActor.getSnapshot().context.editors[1]
    const editorBLocator = page.getByTestId(editorBRef.id)

    context.editorB = {
      ref: editorBRef,
      locator: editorBLocator.getByRole('textbox'),
      insertObjectButtonLocator: {
        image: editorBLocator.getByTestId('button-insert-image'),
      },
      insertInlineObjectButtonLocator: {
        'stock-ticker': editorBLocator.getByTestId(
          'button-insert-stock-ticker',
        ),
      },
      selectionLocator: editorBLocator.getByTestId('selection'),
      toggleAnnotationButtonLocator: {
        comment: editorBLocator.getByTestId('button-toggle-comment'),
        link: editorBLocator.getByTestId('button-toggle-link'),
      },
      toggleStyleButtonLocator: {
        normal: editorBLocator.getByTestId('button-toggle-style-normal'),
        h1: editorBLocator.getByTestId('button-toggle-style-h1'),
      },
    }

    vi.waitFor(async () => {
      await expect.element(context.editorA.locator).toBeInTheDocument()
      await expect.element(context.editorB.locator).toBeInTheDocument()
    })
  }),
  Given('a global keymap', async (context: Context) => {
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
    await getValue().then((value) => expect(value).toEqual([]))
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
    await getText().then((actualText) => expect(actualText).toEqual(text))
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
        throw new Error('No new block key was added')
      }

      if (newBlockKeys.length > 1) {
        throw new Error(
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
        context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })
      const newAnnotationKeys = await toggleAnnotation(
        context.editorA,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
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
        context.editorB.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })

      const newAnnotationKeys = await toggleAnnotation(
        context.editorB,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
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
        throw new Error(
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
        context.editorA.ref.send({
          type: 'selection',
          selection: getTextSelection(value, text),
        })
      })

      const newAnnotationKeys = await toggleAnnotation(
        context.editorA,
        annotation,
      )

      if (newAnnotationKeys.length === 0) {
        throw new Error('No new annotation key was added')
      }

      if (newAnnotationKeys.length > 1) {
        throw new Error(
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
        context.editorA.ref.send({
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
        context.editorA.ref.send({
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
  Then(
    '{string} has marks {marks}',
    async (context: Context, text: string, marks: Array<string>) => {
      await getEditorTextMarks(text).then((actualMarks) => {
        expect(actualMarks).toEqual(
          marks.map((mark) =>
            mark === 'em' || mark === 'strong'
              ? mark
              : (context.keyMap.get(mark) ?? mark),
          ),
        )
      })
    },
  ),
  Then(
    '{string} has an annotation different than {key}',
    async (context: Context, text: string, key: string) => {
      await getEditorTextMarks(text).then((marks) => {
        const annotations =
          marks?.filter((mark) => mark !== 'em' && mark !== 'strong') ?? []

        expect(annotations.length).toBeGreaterThan(0)
        expect(
          annotations.some(
            (annotation) => annotation === context.keyMap.get(key),
          ),
        ).toBeFalsy()
      })
    },
  ),
  Then(
    '{string} and {string} have the same marks',
    async (_: Context, textA: string, textB: string) => {
      const marksA = await getEditorTextMarks(textA)
      const marksB = await getEditorTextMarks(textB)

      expect(marksA).toEqual(marksB)
    },
  ),
  Then('{string} has no marks', async (_: Context, text: string) => {
    await getEditorTextMarks(text).then((marks) => expect(marks).toEqual([]))
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
        context.editorA.ref.send({
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
    '{string} is selected backwards',
    async (context: Context, text: string) => {
      const value = await getValue()

      await waitForNewSelection(context.editorA, async () => {
        context.editorA.ref.send({
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
          context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionBeforeInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await waitForNewSelection(context.editorA, async () => {
          context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionBeforeText(value, text),
          })
        })
      }
    },
  ),
  When(
    'the caret is put after {string}',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorA, async () => {
          context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionAfterInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await waitForNewSelection(context.editorA, async () => {
          context.editorA.ref.send({
            type: 'selection',
            selection: getSelectionAfterText(value, text),
          })
        })
      }
    },
  ),
  When(
    'the caret is put after {string} by editor B',
    async (context: Context, text: string) => {
      const value = await getValue()

      if (text === '[stock-ticker]') {
        await waitForNewSelection(context.editorB, async () => {
          context.editorB.ref.send({
            type: 'selection',
            selection: getSelectionAfterInlineObject(
              value,
              text.replace('[', '').replace(']', ''),
            ),
          })
        })
      } else {
        await waitForNewSelection(context.editorB, async () => {
          context.editorB.ref.send({
            type: 'selection',
            selection: getSelectionAfterText(value, text),
          })
        })
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

      expect(collapsed).toBe(true)
      expect(focusText?.slice(selection?.focus.offset)).toBe(text)
    },
  ),
  Then(
    'the caret is after {string}',
    async (context: Context, text: string) => {
      const value = await getValue()
      const selection = await getSelection(context.editorA)

      const collapsed = selectionIsCollapsed(selection)
      const focusText = getSelectionFocusText(value, selection)

      expect(collapsed).toBe(true)
      expect(focusText?.slice(0, selection?.focus.offset)).toBe(text)
    },
  ),
  Then('{text} is selected', async (context: Context, text: Array<string>) => {
    const value = await getValue()
    const selection = await getSelection(context.editorA)

    expect(getSelectionText(value, selection)).toEqual(text)
  }),
  Then('block {key} is selected', async (context: Context, keyKey: string) => {
    await getSelection(context.editorA).then((selection) => {
      const selectionBlockKeys = getSelectionBlockKeys(selection)

      expect(selectionBlockKeys?.anchor).toBe(context.keyMap.get(keyKey))
      expect(selectionBlockKeys?.focus).toBe(context.keyMap.get(keyKey))
    })
  }),

  /**
   * Style steps
   */
  When(
    '{style} is toggled',
    async (context: Context, style: 'h1' | 'normal') => {
      await waitForNewValue(async () =>
        context.editorA.toggleStyleButtonLocator[style].click(),
      )
    },
  ),
  Then(
    'block {index} has style {style}',
    async (_context: Context, index: number, style: 'h1' | 'normal') => {
      const value = await getValue()
      const block = value ? value[index] : undefined

      if (!block || !isPortableTextBlock(block)) {
        throw new Error(`Unable to find text block at index ${index}`)
      }

      expect(block.style).toBe(style)
    },
  ),

  /**
   * Typing steps
   */
  When('{string} is typed', async (context: Context, text: string) => {
    await waitForNewValue(async () => {
      context.editorA.ref.send({type: 'focus'})
      await userEvent.type(context.editorA.locator, text)
    })
  }),
  When(
    '{string} is typed by editor B',
    async (context: Context, text: string) => {
      await waitForNewValue(async () => {
        context.editorB.ref.send({type: 'focus'})
        await userEvent.type(context.editorB.locator, text)
      })
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
        await pressButton(context.editorA, 'Enter')
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
        throw new Error(`No block to find a key for: ${text}`)
      }

      if (text.length > 1) {
        throw new Error(`Unable to find key for multiple blocks: ${text}`)
      }

      const value = await getValue()

      expect(getBlockKey(value, text[0])).toBe(context.keyMap.get(keyKey))
    },
  ),

  /**
   * Button steps
   */
  When('{button} is pressed', async (context: Context, button: ButtonName) => {
    await pressButton(context.editorA, button)
  }),
  When(
    '{button} is pressed by editor B',
    async (context: Context, button: ButtonName) => {
      await pressButton(context.editorB, button)
    },
  ),
  When(
    '{button} is pressed {int} times',
    async (context: Context, button: ButtonName, times: number) => {
      for (let i = 0; i < times; i++) {
        await pressButton(context.editorA, button)
      }
    },
  ),

  /**
   * Undo/redo steps
   */
  When('undo is performed', async (context: Context) => {
    await waitForNewValue(async () => {
      context.editorA.ref.send({type: 'focus'})
      await userEvent.keyboard(`{${getMetaKey()}>}z{/${getMetaKey()}}`)
    })
  }),
  When('undo is performed by editor B', async (context: Context) => {
    await waitForNewValue(async () => {
      context.editorB.ref.send({type: 'focus'})
      await userEvent.keyboard(`{${getMetaKey()}>}z{/${getMetaKey()}}`)
    })
  }),
  When('redo is performed', async (context: Context) => {
    await waitForNewValue(async () => {
      context.editorA.ref.send({type: 'focus'})
      await userEvent.keyboard(`{${getMetaKey()}>}y{/${getMetaKey()}}`)
    })
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
async function pressButton(editor: EditorContext, button: ButtonName) {
  if (button === 'Backspace' || button === 'Delete' || button === 'Enter') {
    return waitForNewValue(() => userEvent.keyboard(`{${button}}`))
  }

  if (button === 'Shift+Enter') {
    return waitForNewValue(() => userEvent.keyboard('{Shift>}{Enter}{/Shift}'))
  }

  if (button === 'Space') {
    return waitForNewValue(() => userEvent.type(editor.locator, ' '))
  }

  return waitForNewSelection(editor, () => userEvent.keyboard(`{${button}}`))
}

function getEditorTextMarks(text: string) {
  return getValue().then((value) => getTextMarks(value, text))
}

async function getValue(): Promise<Array<PortableTextBlock> | undefined> {
  const valueLocator = await page.getByTestId('value')
  const valueNode = await valueLocator.query()

  const value =
    valueNode instanceof HTMLElement && valueNode.innerText
      ? JSON.parse(valueNode.innerText)
      : undefined
  return value
}

function getText() {
  return getValue().then(getValueText)
}

const waitForNewValue = async (changeFn: () => Promise<void>) => {
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

const waitForNewSelection = async (
  editor: EditorContext,
  changeFn: () => Promise<void>,
) => {
  const oldSelection = await getSelection(editor)
  await changeFn()
  return vi.waitFor(async () => {
    const newSelection = await getSelection(editor)
    expect(oldSelection).not.toEqual(newSelection)
  })
}
