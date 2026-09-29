import {
  editorNames,
  type EditorName,
  type NetworkSnapshot,
  type TransactionSource,
} from '@portabletext/io'
import {useState} from 'react'
import {describeSource} from './server-panel'
import {Badge, Button, Empty, ItemList, plural, Section} from './ui'

type FeedItem = NetworkSnapshot['feeds'][EditorName][number]

export function NetworkPanel({
  network,
  onStep,
}: {
  network: NetworkSnapshot | null
  /** Present in free play: runs a `When` step. */
  onStep: ((text: string) => void) | undefined
}) {
  const [selectedBatchIds, setSelectedBatchIds] = useState<Array<string>>([])

  if (!network) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Network</h2>
        <Empty>No network yet</Empty>
      </div>
    )
  }

  const waitingBatchIds = network.saveRequests.map((request) => request.batchId)
  const selectedRequests = network.saveRequests.filter((request) =>
    selectedBatchIds.includes(request.batchId),
  )

  function toggleSelected(batchId: string) {
    setSelectedBatchIds((current) =>
      current.includes(batchId)
        ? current.filter((candidate) => candidate !== batchId)
        : [
            ...current.filter((candidate) =>
              waitingBatchIds.includes(candidate),
            ),
            batchId,
          ],
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Network</h2>
        <span className="font-mono text-xs text-gray-500">
          t = {network.now / 1000} s
        </span>
        {onStep ? (
          <Button
            onClick={() =>
              onStep('the wait for the missing transaction runs out')
            }
            title="When the wait for the missing transaction runs out"
          >
            advance 10 s
          </Button>
        ) : null}
      </header>

      <Section title="Save requests">
        {network.saveRequests.length === 0 ? (
          <Empty>none waiting</Empty>
        ) : (
          <ItemList>
            {network.saveRequests.map((request) => (
              <li key={request.batchId} className="flex items-center gap-1">
                {onStep ? (
                  <input
                    type="checkbox"
                    title="select to receive two batches as one transaction"
                    checked={selectedBatchIds.includes(request.batchId)}
                    onChange={() => toggleSelected(request.batchId)}
                  />
                ) : null}
                <span className="flex-1">
                  {request.editor}'s batch {request.batchNumber} ·{' '}
                  {plural(request.patchCount, 'patch')}
                  {request.final ? ' · final' : null}
                </span>
                {onStep ? (
                  <>
                    <Button
                      onClick={() =>
                        onStep(
                          request.final
                            ? `the server receives ${request.editor}'s final batch`
                            : `the server receives ${request.editor}'s batch ${request.batchNumber}`,
                        )
                      }
                    >
                      server receives
                    </Button>
                    <Button
                      onClick={() =>
                        onStep(
                          `the server refuses ${request.editor}'s batch ${request.batchNumber}`,
                        )
                      }
                    >
                      refuse
                    </Button>
                  </>
                ) : null}
              </li>
            ))}
          </ItemList>
        )}
        {onStep && network.saveRequests.length > 1 ? (
          <div>
            <Button
              disabled={selectedRequests.length !== 2}
              onClick={() => {
                const [first, second] = selectedRequests
                setSelectedBatchIds([])
                onStep(
                  `the server receives ${first.editor}'s batch ${first.batchNumber} and ${second.editor}'s batch ${second.batchNumber} as one transaction`,
                )
              }}
            >
              receive the two selected as one
            </Button>
          </div>
        ) : null}
      </Section>

      <Section title="Replies">
        {network.replies.length === 0 ? (
          <Empty>none waiting</Empty>
        ) : (
          <ItemList>
            {network.replies.map((reply) => (
              <li key={reply.batchId} className="flex items-center gap-1">
                <span className="flex-1">
                  {reply.editor}'s batch {reply.batchNumber}{' '}
                  <Badge tone={reply.outcome === 'accepted' ? 'green' : 'red'}>
                    {reply.outcome}
                  </Badge>
                </span>
                {onStep ? (
                  <Button
                    onClick={() =>
                      onStep(
                        `${reply.editor}'s batch ${reply.batchNumber} is ${reply.outcome}`,
                      )
                    }
                  >
                    deliver
                  </Button>
                ) : null}
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      {editorNames.map((receiver) => (
        <Section key={receiver} title={`Feed to ${receiver}`}>
          {network.feeds[receiver].length === 0 ? (
            <Empty>none waiting</Empty>
          ) : (
            <ItemList>
              {network.feeds[receiver].map((item, index, feed) => {
                const blockedBy = earlierNamedItem(feed, index)

                return (
                  <li
                    key={item.transactionId}
                    className="flex items-center gap-1"
                  >
                    <span className="flex-1">
                      {item.transactionId}: {item.previousRev ?? '∅'} →{' '}
                      {item.resultRev ?? '∅'}{' '}
                      <span className="text-gray-500">
                        · {describeSource(item.source)}
                      </span>
                    </span>
                    {onStep ? (
                      <Button
                        disabled={blockedBy !== undefined}
                        title={
                          blockedBy === undefined
                            ? undefined
                            : `Deliver ${blockedBy} first: the steps name it the same way`
                        }
                        onClick={() =>
                          onStep(deliveryStep(receiver, item.source))
                        }
                      >
                        deliver
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ItemList>
          )}
        </Section>
      ))}
    </div>
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
