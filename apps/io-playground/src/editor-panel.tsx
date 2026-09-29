import type {
  BatchSnapshot,
  EditorName,
  EditorSnapshot,
  HeardEvent,
} from '@portabletext/io'
import type {ReactNode} from 'react'
import type {ConceptName} from './concepts'
import {useOpenDetails} from './drawers'
import {describePatches} from './narration'
import {
  Badge,
  DetailsLink,
  Empty,
  ItemList,
  Label,
  plural,
  Revision,
  RevisionStep,
  Section,
  TextspecValue,
  useFlash,
} from './ui'

export function EditorPanel({
  name,
  editor,
  waitingCount,
}: {
  name: EditorName
  editor: EditorSnapshot | undefined
  /** Transactions waiting in this editor's feed. */
  waitingCount: number
}) {
  const flash = useFlash(JSON.stringify(editor ?? null))

  return (
    <section
      aria-label={name}
      className={`flex min-h-0 flex-col gap-3 overflow-auto rounded border border-gray-200 p-3 ${flash}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{name}</h2>
        {editor ? (
          <>
            <Badge
              tone={
                editor.status === 'ready'
                  ? 'green'
                  : editor.status === 'loading'
                    ? 'amber'
                    : 'gray'
              }
            >
              {editor.status}
            </Badge>
            {waitingCount > 0 ? (
              <Badge tone="amber">{waitingCount} waiting</Badge>
            ) : null}
            {editor.readOnly ? <Badge tone="blue">read-only</Badge> : null}
            {editor.outOfStep ? <Badge tone="red">out of step</Badge> : null}
          </>
        ) : null}
      </header>

      {editor ? (
        <EditorDetails name={name} editor={editor} />
      ) : (
        <Empty>No editors yet</Empty>
      )}
    </section>
  )
}

function EditorDetails({
  name,
  editor,
}: {
  name: EditorName
  editor: EditorSnapshot
}) {
  const openDetails = useOpenDetails()
  const batchLink = (batch: BatchSnapshot) => (
    <DetailsLink
      label={`Details of ${name}'s batch ${batch.batchNumber}`}
      onClick={() =>
        openDetails({
          type: 'batch',
          editor: name,
          batchNumber: batch.batchNumber,
        })
      }
    >
      batch {batch.batchNumber} → {batch.transactionId ?? '?'} ·{' '}
      {plural(batch.patchCount, 'patch')}
    </DetailsLink>
  )

  return (
    <>
      <Section title="screen" concept="screen">
        <TextspecValue textspec={editor.screen} blocks={editor.blocks} />
      </Section>

      <Section
        title="base"
        concept="base"
        suffix={
          editor.base.rev === null ? (
            <>· the server's copy, no document yet</>
          ) : (
            <>
              · the server's copy at <Label concept="revision">revision</Label>{' '}
              <Revision rev={editor.base.rev} />
            </>
          )
        }
      >
        {editor.base.textspec === null ? (
          <Empty>no field</Empty>
        ) : (
          <TextspecValue
            textspec={editor.base.textspec}
            blocks={editor.base.blocks}
          />
        )}
      </Section>

      <Section title="ledger">
        <ItemList>
          <LedgerRow concept="in flight" label="in flight">
            {editor.inFlight ? batchLink(editor.inFlight) : 'nothing'}
          </LedgerRow>
          <LedgerRow concept="pending" label="pending">
            {editor.pending.length === 0 ? (
              'nothing'
            ) : (
              <span className="flex flex-col">
                {editor.pending.map((change, index) => (
                  <DetailsLink
                    key={index}
                    label={`Details of ${name}'s pending change ${index + 1}`}
                    onClick={() =>
                      openDetails({type: 'pending', editor: name, index})
                    }
                  >
                    change {index + 1} · {describePatches(change.patches)}
                  </DetailsLink>
                ))}
              </span>
            )}
          </LedgerRow>
          <LedgerRow concept="held" label="held">
            {editor.held.length === 0 ? (
              'nothing'
            ) : (
              <span className="flex flex-col">
                {editor.held.map((transaction) => (
                  <span key={transaction.transactionId}>
                    <DetailsLink
                      label={`Details of transaction ${transaction.transactionId}`}
                      onClick={() =>
                        openDetails({
                          type: 'transaction',
                          transactionId: transaction.transactionId,
                        })
                      }
                    >
                      {transaction.transactionId}
                    </DetailsLink>
                    :{' '}
                    <RevisionStep
                      from={transaction.previousRev}
                      to={transaction.resultRev}
                    />
                  </span>
                ))}
              </span>
            )}
          </LedgerRow>
          {editor.echoed.length > 0 ? (
            <LedgerRow concept="held echo" label="held echo">
              <span className="flex flex-col">
                {editor.echoed.map((batch) => (
                  <span key={batch.batchNumber}>{batchLink(batch)}</span>
                ))}
              </span>
            </LedgerRow>
          ) : null}
          <LedgerRow concept="rejected" label="rejected">
            {editor.rejected ? batchLink(editor.rejected) : 'nothing'}
          </LedgerRow>
          <LedgerRow concept="out of step" label="out of step">
            {editor.outOfStep ? 'yes' : 'no'}
          </LedgerRow>
          <LedgerRow concept="read-only" label="read-only">
            {editor.readOnly ? 'yes' : 'no'}
          </LedgerRow>
        </ItemList>
      </Section>

      <Section title="sent batches" concept="batch">
        {editor.sentBatches.length === 0 ? (
          <Empty>none</Empty>
        ) : (
          <ItemList>
            {editor.sentBatches.map((batch) => (
              <li key={batch.number}>
                <DetailsLink
                  label={`Details of ${name}'s batch ${batch.number}`}
                  onClick={() =>
                    openDetails({
                      type: 'batch',
                      editor: name,
                      batchNumber: batch.number,
                    })
                  }
                >
                  batch {batch.number} → {batch.transactionId} ·{' '}
                  {plural(batch.patchCount, 'patch')}
                  {batch.final ? ' · final' : null}
                </DetailsLink>
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      <Section title="events">
        {editor.events.length === 0 ? (
          <Empty>none</Empty>
        ) : (
          <ItemList>
            {editor.events.map((event, index) => (
              <li key={index} className={eventTone(event)}>
                <Label concept={event.type}>{event.type}</Label>{' '}
                {describeEvent(event)}
              </li>
            ))}
          </ItemList>
        )}
      </Section>
    </>
  )
}

function LedgerRow({
  concept,
  label,
  children,
}: {
  concept: ConceptName
  label: string
  children: ReactNode
}) {
  return (
    <li className="flex gap-1">
      <span className="shrink-0 text-gray-500">
        <Label concept={concept}>{label}:</Label>
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function describeEvent(event: HeardEvent): string {
  switch (event.type) {
    case 'change':
      return `· ${event.origin} · ${plural(event.patchCount, 'patch')}`
    case 'error':
      return `· ${event.reason}${event.transactionId === undefined ? '' : ` · ${event.transactionId}`}`
    case 'warning':
      return `· ${event.message}`
  }
}

function eventTone(event: HeardEvent): string {
  switch (event.type) {
    case 'change':
      return 'text-gray-700'
    case 'error':
      return 'text-red-700'
    case 'warning':
      return 'text-amber-700'
  }
}
