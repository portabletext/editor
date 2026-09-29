import type {
  EditorName,
  EditorSnapshot,
  NetworkSnapshot,
  TransactionSource,
} from '@portabletext/io'
import type {ReactNode} from 'react'
import {useOpenDetails} from './drawers'
import {describeSource, isOwnFeedItem} from './narration'
import {
  Badge,
  Button,
  DetailsLink,
  Empty,
  Label,
  plural,
  RevisionStep,
  useFlash,
} from './ui'

type FeedItem = NetworkSnapshot['feeds'][EditorName][number]

/**
 * The link between one editor and the server: save requests travel up
 * toward the server, save replies and the feed travel down toward the editor.
 * Cards sit oldest nearest the party that takes them next.
 */
export function LinkPanel({
  name,
  editorSide,
  editor,
  network,
  onStep,
  onDeliver,
  selectedBatchIds,
  onToggleSelected,
}: {
  name: EditorName
  /** Where the editor sits relative to this link. */
  editorSide: 'left' | 'right'
  editor: EditorSnapshot | undefined
  network: NetworkSnapshot | null
  /** Present in free play: runs a `When` step. */
  onStep: ((text: string) => void) | undefined
  /**
   * Present in free play and after a scenario is done: runs a delivery
   * `When` step and tells whether it succeeded.
   */
  onDeliver: ((text: string) => boolean) | undefined
  /** Save requests picked to be received as one transaction. */
  selectedBatchIds: Array<string>
  onToggleSelected: (batchId: string) => void
}) {
  const requests =
    network?.saveRequests.filter((request) => request.editor === name) ?? []
  const replies =
    network?.replies.filter((reply) => reply.editor === name) ?? []
  const feed = network?.feeds[name] ?? []
  const flash = useFlash(JSON.stringify({requests, replies, feed}))
  const openDetails = useOpenDetails()
  const towardServer = editorSide === 'left' ? '→' : '←'
  const towardEditor = editorSide === 'left' ? '←' : '→'
  const upwardOrder = editorSide === 'left' ? 'flex-row-reverse' : 'flex-row'
  const downwardOrder = editorSide === 'left' ? 'flex-row' : 'flex-row-reverse'

  return (
    <section
      aria-label={`link ${name === 'Editor A' ? 'A' : 'B'}`}
      className={`flex min-h-0 flex-col gap-3 overflow-auto rounded border border-dashed border-gray-300 p-2 ${flash}`}
    >
      <h2 className="text-center text-sm font-semibold text-gray-600">
        link {name === 'Editor A' ? 'A' : 'B'}
      </h2>

      {network ? (
        <>
          <Lane
            label="toward the server"
            heading={
              <>
                <Label concept="save request">save requests</Label>{' '}
                <span aria-hidden="true">{towardServer} Server</span>
              </>
            }
          >
            {requests.length === 0 ? (
              <Empty>none waiting</Empty>
            ) : (
              <div className={`flex flex-wrap gap-1.5 ${upwardOrder}`}>
                {requests.map((request) => (
                  <Card
                    key={request.batchId}
                    label={`save request for ${name}'s batch ${request.batchNumber}`}
                  >
                    <div className="flex items-start gap-1">
                      {onStep && network.saveRequests.length > 1 ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${name}'s batch ${request.batchNumber} to receive two batches as one transaction`}
                          title="select to receive two batches as one transaction"
                          checked={selectedBatchIds.includes(request.batchId)}
                          onChange={() => onToggleSelected(request.batchId)}
                          className="mt-0.5"
                        />
                      ) : null}
                      <DetailsLink
                        label={`Details of ${name}'s batch ${request.batchNumber}`}
                        onClick={() =>
                          openDetails({
                            type: 'batch',
                            editor: name,
                            batchNumber: request.batchNumber,
                          })
                        }
                      >
                        batch {request.batchNumber} →{' '}
                        {editor?.sentBatches[request.batchNumber - 1]
                          ?.transactionId ?? request.batchId}
                      </DetailsLink>
                    </div>
                    <span className="text-gray-500">
                      {plural(request.patchCount, 'patch')}
                      {request.final ? ' · final' : null}
                    </span>
                    {onStep ? (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          onClick={() =>
                            onStep(
                              request.final
                                ? `the server receives ${name}'s final batch`
                                : `the server receives ${name}'s batch ${request.batchNumber}`,
                            )
                          }
                        >
                          server receives
                        </Button>
                        <button
                          type="button"
                          onClick={() =>
                            onStep(
                              `the server refuses ${name}'s batch ${request.batchNumber}`,
                            )
                          }
                          className="text-xs text-red-700 underline hover:text-red-900"
                        >
                          refuse
                        </button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </Lane>

          <Lane
            label={`toward ${name}`}
            heading={
              <>
                {editorSide === 'left' ? (
                  <span aria-hidden="true">
                    {towardEditor} {name}
                  </span>
                ) : null}
                <Label concept="save reply">save replies</Label> and the{' '}
                <Label concept="feed">feed</Label>
                {editorSide === 'right' ? (
                  <span aria-hidden="true">
                    {towardEditor} {name}
                  </span>
                ) : null}
              </>
            }
          >
            {replies.length === 0 ? null : (
              <div className={`flex flex-wrap gap-1.5 ${downwardOrder}`}>
                {replies.map((reply) => (
                  <Card
                    key={reply.batchId}
                    label={`save reply for ${name}'s batch ${reply.batchNumber}`}
                  >
                    <span>
                      reply:{' '}
                      <Badge
                        tone={reply.outcome === 'accepted' ? 'green' : 'red'}
                      >
                        {reply.outcome}
                      </Badge>
                    </span>
                    <span className="text-gray-500">
                      batch {reply.batchNumber}
                    </span>
                    {onDeliver ? (
                      <div>
                        <Button
                          onClick={() =>
                            onDeliver(
                              `${name}'s batch ${reply.batchNumber} is ${reply.outcome}`,
                            )
                          }
                        >
                          deliver
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}

            {feed.length === 0 ? (
              <Empty>no transactions waiting</Empty>
            ) : (
              <div className={`flex flex-wrap gap-1.5 ${downwardOrder}`}>
                {feed.map((item, index) => {
                  const blockedBy = earlierNamedItem(feed, index)
                  const yours = isOwnFeedItem(item, name)

                  return (
                    <Card
                      key={item.transactionId}
                      label={`transaction ${item.transactionId} waiting for ${name}`}
                    >
                      <span className="flex flex-wrap items-center gap-1">
                        <DetailsLink
                          label={`Details of transaction ${item.transactionId}`}
                          onClick={() =>
                            openDetails({
                              type: 'transaction',
                              transactionId: item.transactionId,
                            })
                          }
                        >
                          {item.transactionId}
                        </DetailsLink>
                        {yours ? <Badge tone="blue">yours</Badge> : null}
                      </span>
                      <RevisionStep
                        from={item.previousRev}
                        to={item.resultRev}
                      />
                      <span className="text-gray-500">
                        {describeSource(item.source)}
                      </span>
                      {onDeliver ? (
                        <div>
                          <Button
                            disabled={blockedBy !== undefined}
                            title={
                              blockedBy === undefined
                                ? undefined
                                : `Deliver ${blockedBy} first: the steps name it the same way`
                            }
                            onClick={() =>
                              onDeliver(deliveryStep(name, item.source))
                            }
                          >
                            deliver
                          </Button>
                        </div>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            )}

            {onDeliver ? (
              <div
                className={`flex ${editorSide === 'left' ? 'justify-start' : 'justify-end'}`}
              >
                <Button
                  disabled={feed.length === 0}
                  onClick={() => {
                    for (const item of feed) {
                      if (!onDeliver(deliveryStep(name, item.source))) {
                        break
                      }
                    }
                  }}
                >
                  deliver all
                </Button>
              </div>
            ) : null}
          </Lane>
        </>
      ) : (
        <Empty>No network yet</Empty>
      )}
    </section>
  )
}

function Lane({
  label,
  heading,
  children,
}: {
  label: string
  heading: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-1.5 rounded bg-white/60 p-1.5 ring-1 ring-gray-200"
    >
      <h3 className="flex flex-wrap items-center gap-1 text-xs font-semibold text-gray-500">
        {heading}
      </h3>
      {children}
    </section>
  )
}

function Card({label, children}: {label: string; children: ReactNode}) {
  return (
    <article
      aria-label={label}
      className="flex w-36 flex-col gap-1 rounded border border-gray-300 bg-white p-1.5 font-mono text-xs shadow-sm"
    >
      {children}
    </article>
  )
}

function deliveryStep(receiver: EditorName, source: TransactionSource): string {
  if (source.type === 'named') {
    return source.name === 'the other field'
      ? `${receiver} receives the other field's change`
      : `${receiver} receives ${source.name}`
  }

  const batch =
    source.batches.find((candidate) => candidate.name === receiver) ??
    source.batches[0]

  return batch.name === receiver
    ? `${receiver}'s batch ${batch.batchNumber} comes back`
    : `${receiver} receives ${batch.name}'s batch ${batch.batchNumber}`
}

/**
 * A server change is delivered by name, and the name picks the earliest
 * waiting one, so a later one with the same name can't be delivered first.
 */
function earlierNamedItem(
  feed: Array<FeedItem>,
  index: number,
): string | undefined {
  const item = feed[index]

  if (item.source.type !== 'named') {
    return undefined
  }

  const {name} = item.source
  const earlier = feed
    .slice(0, index)
    .find(
      (candidate) =>
        candidate.source.type === 'named' && candidate.source.name === name,
    )

  return earlier?.transactionId
}
