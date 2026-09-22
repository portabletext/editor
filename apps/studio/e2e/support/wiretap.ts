import type {ListenEvent, MutationEvent, SanityClient} from '@sanity/client'

export type WiretapEntry = {
  event: MutationEvent
  receivedAt: number
}

export type Wiretap = {
  entries: WiretapEntry[]
  done: Promise<WiretapEntry[]>
}

/**
 * Subscribes to the mutation stream for `documentIds` (published and draft)
 * before the caller navigates, so no mutation the navigation triggers is
 * missed. `done` resolves with every entry recorded once `windowMs` has
 * elapsed, unsubscribing along the way; the timer starts at call time, not
 * when `done` is awaited, so it runs concurrently with whatever the caller
 * does between calling `wiretap` and awaiting `done`.
 */
export function wiretap(
  client: SanityClient,
  documentIds: string[],
  windowMs: number,
): Wiretap {
  const entries: WiretapEntry[] = []
  const ids = documentIds.flatMap((id) => [id, `drafts.${id}`])
  const subscription = client
    .listen(
      '*[_id in $ids]',
      {ids},
      {includeResult: true, visibility: 'transaction'},
    )
    .subscribe((event: ListenEvent<Record<string, unknown>>) => {
      if (event.type === 'mutation') {
        entries.push({event, receivedAt: Date.now()})
      }
    })
  const done = new Promise<WiretapEntry[]>((resolve) => {
    setTimeout(() => {
      subscription.unsubscribe()
      resolve(entries)
    }, windowMs)
  })
  return {entries, done}
}
