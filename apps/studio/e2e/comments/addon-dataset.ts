import type {SanityClient} from '@sanity/client'

/**
 * Resolves Studio's comments addon dataset for the lab project/dataset
 * (`e2sapjbh`'s `scratch` gets `scratch-comments`) and returns a client
 * scoped to it. Studio provisions this dataset lazily on a project's first
 * comment; by the time a comments spec runs against `e2sapjbh` it already
 * exists, so this only resolves the name, never creates it.
 */
export async function getCommentsAddonDatasetClient(
  client: SanityClient,
): Promise<SanityClient> {
  const {projectId, dataset} = client.config()
  const [addonDataset] = await client.request<Array<{name: string}>>({
    url: `/projects/${projectId}/datasets?datasetProfile=comments&addonFor=${dataset}`,
    tag: 'pte-lab.e2e',
  })
  if (!addonDataset) {
    throw new Error(
      `no comments addon dataset for ${projectId}/${dataset}; add a comment through Studio once to provision it`,
    )
  }
  return client.withConfig({dataset: addonDataset.name, useCdn: false})
}

/**
 * Deletes every comment document targeting `documentId` (the published id)
 * from the addon dataset, so a comments spec starts from an empty thread
 * list regardless of what a previous run left behind. The main `resetDoc`
 * only resets the article itself; comments live in a separate dataset the
 * article reset never touches.
 */
export async function resetComments(
  addonClient: SanityClient,
  documentId: string,
) {
  const ids: string[] = await addonClient.fetch(
    '*[_type == "comment" && target.document._ref == $documentId]._id',
    {documentId},
  )
  if (ids.length === 0) return
  const transaction = ids.reduce(
    (tx, id) => tx.delete(id),
    addonClient.transaction(),
  )
  await transaction.commit()
}
