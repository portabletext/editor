import {expect, test} from '@playwright/test'
import {commentsFixtures} from '../../scripts/seed.mjs'
import {createLabClient} from '../support/client'
import {openDocument, waitForRenderState} from '../support/render-state'
import {resetDoc} from '../support/seed'
import {getCommentsAddonDatasetClient, resetComments} from './addon-dataset'
import {
  addedCommentDecorations,
  addInlineComment,
  putCaretBefore,
} from './comment-ui'

// The floating comment popover positions itself under the selected text; at
// the default viewport height the seeded body sits low enough that the
// document pane's footer intercepts it.
test.use({viewport: {width: 1280, height: 1600}})

const client = createLabClient()

test.describe.serial('inline comments', () => {
  test('creating an inline comment decorates the selected text', async ({
    page,
  }) => {
    const id = 'pte-lab.comments.clean'
    await resetDoc(client, commentsFixtures, id)
    const addonClient = await getCommentsAddonDatasetClient(client)
    await resetComments(addonClient, id)

    await openDocument(page, id)
    expect(await waitForRenderState(page)).toBe('editor')
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Comments control article',
    )

    await expect(addedCommentDecorations(page)).toHaveCount(0)

    const word = page.getByText('bar', {exact: true})
    await addInlineComment(page, word, 'a comment on bar')

    const decoration = addedCommentDecorations(page)
    await expect(decoration).toHaveCount(1)
    await expect(decoration).toHaveText('bar')
  })

  test('the comment highlight tracks edits', async ({page}) => {
    const id = 'pte-lab.comments.clean'
    await resetDoc(client, commentsFixtures, id)
    const addonClient = await getCommentsAddonDatasetClient(client)
    await resetComments(addonClient, id)

    await openDocument(page, id)
    expect(await waitForRenderState(page)).toBe('editor')

    const word = page.getByText('bar', {exact: true})
    await addInlineComment(page, word, 'a comment on bar')

    const decoration = addedCommentDecorations(page)
    await expect(decoration).toHaveText('bar')

    // Clicking on or near the decoration selects its whole commented range
    // (Studio's own click-to-select-the-comment behavior), so the caret is
    // placed programmatically instead of with the mouse.
    const editorBody = page.locator('[data-pt-editor]').first()
    await putCaretBefore(page, 'bar')
    await page.keyboard.type('XY')

    await expect(decoration).toHaveText('bar')
    await expect(editorBody).toContainText('foo XYbar baz.')
  })
})
