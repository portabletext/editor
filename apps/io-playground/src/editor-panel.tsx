import type {
  BatchSnapshot,
  EditorName,
  EditorSnapshot,
  HeardEvent,
} from '@portabletext/io'
import {Badge, Empty, ItemList, Notation, plural, Section} from './ui'

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
  return (
    <div className="flex flex-col gap-3">
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
        <EditorDetails editor={editor} />
      ) : (
        <Empty>No editors yet</Empty>
      )}
    </div>
  )
}

function EditorDetails({editor}: {editor: EditorSnapshot}) {
  const pendingPatchCount = editor.pending.reduce(
    (count, change) => count + change.patchCount,
    0,
  )

  return (
    <>
      <Section title="Screen">
        <Notation>{editor.screen}</Notation>
      </Section>

      <Section title="Base">
        <div className="flex items-center gap-2">
          {editor.base.textspec === null ? (
            <Empty>no field</Empty>
          ) : (
            <Notation>{editor.base.textspec}</Notation>
          )}
          <span className="font-mono text-xs text-gray-500">
            @ {editor.base.rev ?? 'no document'}
          </span>
        </div>
      </Section>

      <Section title="Ledger">
        <ItemList>
          <li>
            in flight:{' '}
            {editor.inFlight ? describeBatch(editor.inFlight) : 'nothing'}
          </li>
          {editor.echoed.map((batch) => (
            <li key={batch.batchNumber}>
              came back, waiting: {describeBatch(batch)}
            </li>
          ))}
          <li>
            pending:{' '}
            {editor.pending.length === 0
              ? 'nothing'
              : `${plural(editor.pending.length, 'change')} (${plural(pendingPatchCount, 'patch')})`}
          </li>
          <li>
            rejected:{' '}
            {editor.rejected ? describeBatch(editor.rejected) : 'nothing'}
          </li>
          <li>
            held: {editor.held.length === 0 ? 'nothing' : null}
            {editor.held.map((transaction) => (
              <div key={transaction.transactionId} className="pl-4">
                {transaction.transactionId}: {transaction.previousRev ?? '∅'} →{' '}
                {transaction.resultRev ?? '∅'}
              </div>
            ))}
          </li>
        </ItemList>
      </Section>

      <Section title="Sent batches">
        {editor.sentBatches.length === 0 ? (
          <Empty>none</Empty>
        ) : (
          <ItemList>
            {editor.sentBatches.map((batch) => (
              <li key={batch.number}>
                batch {batch.number} → {batch.transactionId} ·{' '}
                {plural(batch.patchCount, 'patch')}
                {batch.final ? ' · final' : null}
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      <Section title="Events">
        {editor.events.length === 0 ? (
          <Empty>none</Empty>
        ) : (
          <ItemList>
            {editor.events.map((event, index) => (
              <li key={index} className={eventTone(event)}>
                {describeEvent(event)}
              </li>
            ))}
          </ItemList>
        )}
      </Section>
    </>
  )
}

function describeBatch(batch: BatchSnapshot): string {
  return `batch ${batch.batchNumber} → ${batch.transactionId ?? '?'} (${plural(batch.patchCount, 'patch')})`
}

function describeEvent(event: HeardEvent): string {
  switch (event.type) {
    case 'change':
      return `change · ${event.origin} · ${plural(event.patchCount, 'patch')}`
    case 'error':
      return `error · ${event.reason}${event.transactionId === undefined ? '' : ` · ${event.transactionId}`}`
    case 'warning':
      return `warning · ${event.message}`
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
