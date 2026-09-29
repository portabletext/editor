import type {ServerSnapshot, TransactionSource} from '@portabletext/io'
import {useState} from 'react'
import {quoted} from './gherkin'
import {
  Badge,
  Button,
  Empty,
  ItemList,
  Notation,
  plural,
  Section,
  TextInput,
} from './ui'

export function ServerPanel({
  server,
  onStep,
}: {
  server: ServerSnapshot | null
  /** Present in free play: runs a `When` step. */
  onStep: ((text: string) => void) | undefined
}) {
  const [recreatedAs, setRecreatedAs] = useState('B: bar')

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Server</h2>
        {server ? (
          <span className="font-mono text-xs text-gray-500">
            @ {server.rev ?? 'no document'}
          </span>
        ) : null}
      </header>

      {server ? (
        <>
          <Section title="Value">
            {server.value === null ? (
              <Empty>{server.rev === null ? 'no document' : 'no field'}</Empty>
            ) : (
              <Notation>
                {server.value === '' ? 'an empty list' : server.value}
              </Notation>
            )}
          </Section>

          <Section title="Transactions">
            {server.transactions.length === 0 ? (
              <Empty>none</Empty>
            ) : (
              <ItemList>
                {server.transactions.map((transaction, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-1">
                    <span className="font-semibold">{transaction.id}</span>
                    <span>
                      {transaction.previousRev ?? '∅'} →{' '}
                      {transaction.resultRev ?? '∅'}
                    </span>
                    <span className="text-gray-500">
                      · {describeSource(transaction.source)} ·{' '}
                      {plural(transaction.patchCount, 'patch')}
                    </span>
                    {transaction.noop ? (
                      <Badge tone="gray">no change</Badge>
                    ) : null}
                  </li>
                ))}
              </ItemList>
            )}
          </Section>

          {onStep ? (
            <Section title="Server actions">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  onClick={() =>
                    onStep(
                      'another field of the document is changed on the server',
                    )
                  }
                >
                  change another field
                </Button>
                <Button onClick={() => onStep('the document is deleted')}>
                  delete the document
                </Button>
                <Button
                  onClick={() =>
                    onStep(
                      `the document is recreated as ${quoted(recreatedAs)}`,
                    )
                  }
                >
                  recreate as
                </Button>
                <TextInput value={recreatedAs} onChange={setRecreatedAs} />
              </div>
            </Section>
          ) : null}
        </>
      ) : (
        <Empty>No server yet</Empty>
      )}
    </div>
  )
}

export function describeSource(source: TransactionSource): string {
  return source.type === 'named'
    ? source.name
    : source.batches
        .map((batch) => `${batch.name}'s batch ${batch.batchNumber}`)
        .join(' + ')
}
