import type {
  EditorName,
  EditorSnapshot,
  NetworkSnapshot,
  TransactionSource,
} from '@portabletext/io/testing'
import type {ReactNode} from 'react'
import type {LinkApplicability} from './applicable'
import {useOpenDetails} from './drawers'
import {describeSource, isOwnFeedItem} from './narration'
import {
  ActionButton,
  Badge,
  Button,
  DetailsLink,
  Empty,
  InfoMark,
  Label,
  plural,
  Prompts,
  RevisionStep,
  useFlash,
} from './ui'

/**
 * The link between one editor and the server: save requests travel up
 * toward the server, rejections and the feed travel down toward the editor.
 * Cards sit oldest nearest the party that takes them next.
 */
export function LinkPanel({
  name,
  editorSide,
  editor,
  network,
  applicability,
  onStep,
  onDeliver,
  selectedBatchIds,
  onToggleSelected,
  deadFeed,
}: {
  name: EditorName
  /** Where the editor sits relative to this link. */
  editorSide: 'left' | 'right'
  editor: EditorSnapshot | undefined
  network: NetworkSnapshot | null
  applicability: LinkApplicability
  /** Present in free play: runs a `When` step and tells whether it succeeded. */
  onStep: ((text: string) => boolean) | undefined
  /**
   * Present in free play and after a scenario is done: runs a delivery
   * `When` step and tells whether it succeeded.
   */
  onDeliver: ((text: string) => boolean) | undefined
  /** Save requests picked to be received as one transaction. */
  selectedBatchIds: Array<string>
  onToggleSelected: (batchId: string) => void
  /** Whether the network has stopped delivering to the editor's listener. */
  deadFeed: boolean
}) {
  const requests =
    network?.saveRequests.filter((request) => request.editor === name) ?? []
  const replies =
    network?.replies.filter((reply) => reply.editor === name) ?? []
  const lostReplies =
    network?.lostReplies.filter((reply) => reply.editor === name) ?? []
  const feed = network?.feeds[name] ?? []
  const flash = useFlash(JSON.stringify({requests, replies, lostReplies, feed}))
  const openDetails = useOpenDetails()
  const listening = editor?.host !== 'self-confirming'
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
            {onStep ? (
              <Prompts prompts={applicability.towardServer.prompts} />
            ) : null}
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
                        <ActionButton
                          applicability={
                            applicability.towardServer.saveRequests[
                              request.batchId
                            ] ?? {enabled: true}
                          }
                          onClick={() =>
                            onStep(
                              request.final
                                ? `the server receives ${name}'s final batch`
                                : `the server receives ${name}'s batch ${request.batchNumber}`,
                            )
                          }
                        >
                          server receives
                        </ActionButton>
                        {([400, 503] as const).map((failure) => (
                          <button
                            key={failure}
                            type="button"
                            onClick={() => {
                              if (
                                onStep(
                                  `the server's next request fails with ${failure}`,
                                )
                              ) {
                                onStep(
                                  request.final
                                    ? `the server receives ${name}'s final batch`
                                    : `the server receives ${name}'s batch ${request.batchNumber}`,
                                )
                              }
                            }}
                            className="text-xs text-red-700 underline hover:text-red-900"
                          >
                            fail ({failure})
                          </button>
                        ))}
                        <ActionButton
                          applicability={
                            applicability.towardServer.loseReply[
                              request.batchId
                            ] ?? {enabled: true}
                          }
                          onClick={() => {
                            if (
                              onStep(
                                `the server receives ${name}'s batch ${request.batchNumber}`,
                              )
                            ) {
                              onStep(
                                `the save reply for ${name}'s batch ${request.batchNumber} is lost`,
                              )
                            }
                          }}
                        >
                          lose reply
                        </ActionButton>
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
                <Label concept="rejection">failed saves</Label>
                {listening ? (
                  <>
                    {' '}
                    and the <Label concept="feed">feed</Label>
                  </>
                ) : null}
                {deadFeed ? <Badge tone="red">feed dead</Badge> : null}
                {editorSide === 'right' ? (
                  <span aria-hidden="true">
                    {towardEditor} {name}
                  </span>
                ) : null}
              </>
            }
          >
            {onDeliver ? (
              <Prompts prompts={applicability.towardEditor.prompts} />
            ) : null}
            {replies.length === 0 ? null : (
              <div className={`flex flex-wrap gap-1.5 ${downwardOrder}`}>
                {replies.map((reply) => (
                  <Card
                    key={reply.batchId}
                    label={`failure reply for ${name}'s batch ${reply.batchNumber}`}
                  >
                    <span>
                      <Badge tone="red">failed: {reply.status}</Badge>
                    </span>
                    <span className="text-gray-500">
                      batch {reply.batchNumber}
                    </span>
                    {onDeliver ? (
                      <div>
                        <ActionButton
                          applicability={
                            applicability.towardEditor.replies[
                              reply.batchId
                            ] ?? {enabled: true}
                          }
                          onClick={() =>
                            onDeliver(
                              `the save reply for ${name}'s batch ${reply.batchNumber} arrives`,
                            )
                          }
                        >
                          deliver
                        </ActionButton>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}

            {lostReplies.length === 0 ? null : (
              <div className={`flex flex-wrap gap-1.5 ${downwardOrder}`}>
                {lostReplies.map((reply) => (
                  <Card
                    key={reply.batchId}
                    label={`lost save reply for ${name}'s batch ${reply.batchNumber}`}
                  >
                    <span className="flex flex-wrap items-center gap-1">
                      <Badge tone="amber">reply lost</Badge>
                      <InfoMark concept="lost reply" />
                    </span>
                    <span className="text-gray-500">
                      batch {reply.batchNumber} →{' '}
                      {editor?.sentBatches[reply.batchNumber - 1]
                        ?.transactionId ?? reply.batchId}
                    </span>
                    {onStep ? (
                      <div>
                        <ActionButton
                          applicability={
                            applicability.towardEditor.lostReplies[
                              reply.batchId
                            ] ?? {enabled: true}
                          }
                          onClick={() =>
                            onStep(
                              `${name}'s batch ${reply.batchNumber} is retried`,
                            )
                          }
                        >
                          retry
                        </ActionButton>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}

            {!listening ? (
              <Empty>
                no listener: the host confirms each batch from the answer to its
                own save
              </Empty>
            ) : feed.length === 0 ? (
              <Empty>no transactions waiting</Empty>
            ) : (
              <div className={`flex flex-wrap gap-1.5 ${downwardOrder}`}>
                {feed.map((item) => {
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
                          <ActionButton
                            applicability={
                              applicability.towardEditor.feed[
                                item.transactionId
                              ] ?? {enabled: true}
                            }
                            onClick={() =>
                              onDeliver(deliveryStep(name, item.source))
                            }
                          >
                            deliver
                          </ActionButton>
                        </div>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            )}

            {onDeliver ? (
              <div
                className={`flex gap-1 ${editorSide === 'left' ? 'justify-start' : 'justify-end'}`}
              >
                {onStep ? (
                  <ActionButton
                    applicability={applicability.feedLost}
                    onClick={() => onStep(`${name}'s feed is lost`)}
                  >
                    feed lost
                  </ActionButton>
                ) : null}
                <Button
                  disabled={feed.length === 0 || deadFeed}
                  title={
                    deadFeed
                      ? `the feed is dead: the network delivers nothing to ${name}'s listener`
                      : undefined
                  }
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
