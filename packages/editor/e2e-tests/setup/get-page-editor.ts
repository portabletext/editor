import type {ElementHandle, Page} from '@playwright/test'
import type {PortableTextBlock} from '@sanity/types'
import {isEqual} from 'lodash'
import type {EditorSelection} from '../../src'
import {normalizeSelection} from '../../src/utils/selection'
import type {Editor} from './globals.jest'

export async function getPageEditor({
  page,
  editorId,
  testId,
  onSelection,
  REVISION_TIMEOUT_MS,
  SELECTION_TIMEOUT_MS,
}: {
  page: Page
  editorId: string
  testId: string
  onSelection: (selection: EditorSelection) => void
  REVISION_TIMEOUT_MS: number
  SELECTION_TIMEOUT_MS: number
}): Promise<Editor> {
  const userAgent = await page.evaluate(() => navigator.userAgent)
  const isMac = /Mac|iPod|iPhone|iPad/.test(userAgent)
  const metaKey = isMac ? 'Meta' : 'Control'
  const [
    editableHandle,
    selectionHandle,
    valueHandle,
    revIdHandle,
  ]: (ElementHandle<Element> | null)[] = await Promise.all([
    page.waitForSelector('div[contentEditable="true"]'),
    page.waitForSelector('#pte-selection'),
    page.waitForSelector('#pte-value'),
    page.waitForSelector('#pte-revId'),
  ])

  if (!editableHandle || !selectionHandle || !valueHandle || !revIdHandle) {
    throw new Error('Failed to find required editor elements')
  }

  const addCommentButtonLocator = page.getByTestId('button-add-comment')
  const removeCommentButtonLocator = page.getByTestId('button-remove-comment')
  const toggleCommentButtonLocator = page.getByTestId('button-toggle-comment')
  const toggleLinkButtonLocator = page.getByTestId('button-toggle-link')
  const insertImageButtonLocator = page.getByTestId('button-insert-image')
  const insertStockTickerButtonLocator = page.getByTestId(
    'button-insert-stock-ticker',
  )

  const waitForRevision = async (mutatingFunction?: () => Promise<void>) => {
    if (mutatingFunction) {
      const currentRevId = await revIdHandle.evaluate((node) =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)?.revId
          : null,
      )
      await mutatingFunction()
      await page.waitForSelector(
        `code[data-rev-id]:not([data-rev-id='${currentRevId}'])`,
        {
          timeout: REVISION_TIMEOUT_MS,
        },
      )
    }
  }

  const getSelection = async (): Promise<EditorSelection | null> => {
    const selection = await selectionHandle.evaluate((node) =>
      node instanceof HTMLElement && node.innerText
        ? JSON.parse(node.innerText)
        : null,
    )
    return selection
  }
  const waitForNewSelection = async (
    selectionChangeFn: () => Promise<void>,
  ) => {
    const oldSelection = await getSelection()
    const dataVal = oldSelection ? JSON.stringify(oldSelection) : 'null'
    await selectionChangeFn()
    await page.waitForSelector(
      `code[data-selection]:not([data-selection='${dataVal}'])`,
      {
        timeout: SELECTION_TIMEOUT_MS,
      },
    )
  }

  const waitForSelection = async (selection: EditorSelection) => {
    if (selection && typeof selection.backward === 'undefined') {
      selection.backward = false
    }
    const value = await valueHandle.evaluate(
      (node): PortableTextBlock[] | undefined =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)
          : undefined,
    )
    const normalized = normalizeSelection(selection, value)
    const dataVal = JSON.stringify(normalized)
    await page.waitForSelector(`code[data-selection='${dataVal}']`, {
      timeout: SELECTION_TIMEOUT_MS,
    })
  }
  return {
    testId,
    editorId,
    insertText: async (text: string) => {
      await editableHandle.focus()
      await waitForRevision(async () => {
        await editableHandle.evaluate(
          (node, args) => {
            node.dispatchEvent(
              new InputEvent('beforeinput', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: args[0],
              }),
            )
          },
          [text],
        )
      })
    },
    type: async (text) => {
      await waitForRevision(async () => {
        await page.keyboard.type(text)
      })
    },
    undo: async () => {
      await waitForRevision(async () => {
        await editableHandle.focus()
        await page.keyboard.down(metaKey)
        await page.keyboard.press('z')
        await page.keyboard.up(metaKey)
      })
    },
    redo: async () => {
      await waitForRevision(async () => {
        await editableHandle.focus()
        await page.keyboard.down(metaKey)
        await page.keyboard.press('y')
        await page.keyboard.up(metaKey)
      })
    },
    paste: async (string: string, type = 'text/plain') => {
      // Write text to native clipboard
      await page.evaluate(
        async ({string: _string, type: _type}) => {
          await navigator.clipboard.writeText('') // Clear first
          const blob = new Blob([_string], {type: _type})
          const data = [new ClipboardItem({[_type]: blob})]
          await navigator.clipboard.write(data)
        },
        {string, type},
      )
      await waitForRevision(async () => {
        // Simulate paste key command
        await page.keyboard.down(metaKey)
        await page.keyboard.press('v')
        await page.keyboard.up(metaKey)
      })
    },
    pressButton: async (buttonName, times) => {
      await waitForRevision(() => {
        if (buttonName === 'add-comment') {
          return addCommentButtonLocator.click({clickCount: times})
        }

        if (buttonName === 'remove-comment') {
          return removeCommentButtonLocator.click({clickCount: times})
        }

        if (buttonName === 'toggle-comment') {
          return toggleCommentButtonLocator.click({clickCount: times})
        }

        if (buttonName === 'insert-image') {
          return insertImageButtonLocator.click({clickCount: times})
        }

        if (buttonName === 'insert-stock-ticker') {
          return insertStockTickerButtonLocator.click({
            clickCount: times,
          })
        }

        return Promise.reject(
          new Error(`Button ${buttonName} not accounted for`),
        )
      })
    },
    pressKey: async (
      keyName: string,
      times?: number,
      intent?: 'navigation',
    ) => {
      const pressKey = async () => {
        await editableHandle.press(keyName)
      }
      for (let i = 0; i < (times || 1); i++) {
        // Value manipulation keys
        if (
          keyName.length === 1 ||
          keyName === 'Backspace' ||
          keyName === 'Delete' ||
          keyName === 'Enter'
        ) {
          if (intent === 'navigation') {
            await waitForNewSelection(pressKey)
          } else {
            await waitForRevision(async () => {
              await pressKey()
            })
          }
        } else if (
          // Selection manipulation keys
          [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'PageUp',
            'PageDown',
            'Home',
            'End',
          ].includes(keyName)
        ) {
          await waitForNewSelection(pressKey)
        } else {
          // Unknown keys, test needs should be covered by the above cases.
          console.warn(`Key ${keyName} not accounted for`)
          await pressKey()
        }
      }
    },
    toggleAnnotation: async (annotation) => {
      await waitForRevision(() => {
        if (annotation === 'comment') {
          return toggleCommentButtonLocator.click()
        }

        if (annotation === 'link') {
          return toggleLinkButtonLocator.click()
        }

        return Promise.reject(
          new Error(`Annotation ${annotation} not accounted for`),
        )
      })
    },
    toggleDecoratorUsingKeyboard: async (decorator) => {
      const selection = await selectionHandle.evaluate((node) =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)
          : null,
      )
      const hotkey =
        decorator === 'strong' ? 'b' : decorator === 'em' ? 'i' : undefined

      const performShortcut = hotkey
        ? async () => {
            await page.keyboard.down(metaKey)
            await page.keyboard.down(hotkey)
            await page.keyboard.up(hotkey)
            await page.keyboard.up(metaKey)
          }
        : () =>
            Promise.reject(
              new Error(`Decorator ${decorator} not accounted for`),
            )

      if (selection && isEqual(selection.focus, selection.anchor)) {
        return performShortcut()
      }

      return waitForRevision(performShortcut)
    },
    focus: async () => {
      await editableHandle.focus()
    },
    setSelection: async (selection: EditorSelection | null) => {
      if (selection && typeof selection.backward === 'undefined') {
        selection.backward = false
      }
      onSelection(selection)
      await waitForSelection(selection)
    },
    async getValue(): Promise<PortableTextBlock[] | undefined> {
      const value = await valueHandle.evaluate(
        (node): PortableTextBlock[] | undefined =>
          node instanceof HTMLElement && node.innerText
            ? JSON.parse(node.innerText)
            : undefined,
      )
      return value
    },
    getSelection,
  }
}
