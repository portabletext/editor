import type {Page} from '@playwright/test'

export type RenderState =
  | 'editor'
  | 'missing-keys-guard'
  | 'non-unique-keys-guard'
  | 'unknown'

/** Navigates to a document's default `structure` view. */
export async function openDocument(page: Page, id: string) {
  await page.goto(`/structure/article;${id}`)
}

/**
 * A structurally broken top-level array (a missing or duplicate `_key`) trips
 * Studio's own array-input guard before the PTE engine mounts, so a repair
 * spec needs to tell "PTE mounted" apart from "Studio is showing a guard
 * screen instead" rather than assume the editor always renders.
 */
export async function waitForRenderState(
  page: Page,
  timeoutMs = 15_000,
): Promise<RenderState> {
  const candidates: Array<[RenderState, ReturnType<typeof page.locator>]> = [
    ['editor', page.locator('[data-slate-editor][contenteditable="true"]')],
    ['missing-keys-guard', page.getByText('Missing keys')],
    ['non-unique-keys-guard', page.getByText('Non-unique keys')],
  ]
  const raced = await Promise.race(
    candidates.map(([label, locator]) =>
      locator
        .first()
        .waitFor({state: 'visible', timeout: timeoutMs})
        .then(() => label)
        .catch(() => null),
    ),
  )
  if (raced) {
    return raced
  }
  for (const [label, locator] of candidates) {
    if (
      await locator
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return label
    }
  }
  return 'unknown'
}
