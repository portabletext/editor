import {expect, type Locator, type Page} from '@playwright/test'

/**
 * Selects `word`, opens Studio's inline "Add comment" popover
 * (`inline-comment-button`, the floating button `CommentsPortableTextInput`
 * shows over a text selection), types `message` into the popover's own
 * one-line editor, and submits.
 *
 * Scoped to `InlineCommentInputPopover`'s own `data-ui` root: the "Create a
 * new comment" composer docked in the comments inspector renders a second,
 * hidden `comment-input` for the same field, so an unscoped
 * `[data-testid="comment-input"]` locator matches more than one element.
 */
export async function addInlineComment(
  page: Page,
  word: Locator,
  message: string,
) {
  await word.dblclick()
  await page.locator('[data-testid="inline-comment-button"]').click()

  const popoverInput = page.locator(
    '[data-ui="InlineCommentInputPopover"] [data-testid="comment-input"]',
  )
  await popoverInput.locator('[data-pt-editor][contenteditable="true"]').click()
  await page.keyboard.type(message)
  await popoverInput
    .locator('[data-testid="comment-input-send-button"]')
    .click()
}

/**
 * The range decoration Studio renders around commented text once a comment
 * is added, scoped to the editor body: the comments inspector panel quotes
 * the same commented text in a `blockquote` styled with the same
 * `data-inline-comment-state="added"` attribute, so an unscoped locator
 * matches that quote too.
 *
 * The decoration's end boundary also wraps the zero-width text node the
 * editor renders at the start of the next span, so this excludes any match
 * containing one (`data-pt-zero-width`), leaving only the decoration around
 * the actual commented text.
 */
export function addedCommentDecorations(page: Page) {
  return page
    .locator('[data-pt-editor] [data-inline-comment-state="added"]')
    .filter({hasNot: page.locator('[data-pt-zero-width="true"]')})
}

/**
 * Collapses the editor selection to right before the first occurrence of
 * `text` in the document's body: the Playwright analogue of the editor
 * test suite's "the caret is put before {string}" step, driven through
 * the editor instance the schema's test handle parks on
 * `window.__pteLabEditor`. The selection is computed from the editor's
 * own snapshot, sent as a `select` event, and retried until the snapshot
 * reports it back.
 */
export async function putCaretBefore(page: Page, text: string) {
  await expect(async () => {
    const landed = await page.evaluate((needle) => {
      const editor = window.__pteLabEditor
      if (!editor) {
        return {error: 'no editor handle on window'}
      }

      editor.send({type: 'focus'})

      const value = editor.getSnapshot().context.value ?? []
      for (const block of value) {
        const children =
          'children' in block && Array.isArray(block.children)
            ? block.children
            : []
        for (const child of children) {
          if (typeof child.text !== 'string') {
            continue
          }
          const offset = child.text.indexOf(needle)
          if (offset < 0) {
            continue
          }

          const point = {
            path: [{_key: block._key}, 'children', {_key: child._key}],
            offset,
          }
          const selection = {anchor: point, focus: point}
          editor.send({type: 'select', at: selection})

          return {
            sent: selection,
            reported: editor.getSnapshot().context.selection,
          }
        }
      }

      return {error: `no span containing ${JSON.stringify(needle)}`}
    }, text)

    if ('error' in landed) {
      throw new Error(landed.error)
    }
    expect(landed.reported).toMatchObject(landed.sent)
  }).toPass()
}
