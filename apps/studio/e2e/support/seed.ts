import type {IdentifiedSanityDocumentStub, SanityClient} from '@sanity/client'

/**
 * Deletes the draft (if any) and (re)publishes `id`'s entry from `fixtures`
 * as the published document, so a test starts from the exact seeded shape
 * regardless of what a previous run left behind.
 */
export async function resetDoc(
  client: SanityClient,
  fixtures: IdentifiedSanityDocumentStub[],
  id: string,
) {
  const seed = fixtures.find((doc) => doc._id === id)
  if (!seed) {
    throw new Error(`no seed document for ${id}`)
  }
  await client.delete(`drafts.${id}`)
  await client.createOrReplace(seed)
}
