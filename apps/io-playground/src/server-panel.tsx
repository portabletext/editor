import type {NetworkSnapshot, ServerSnapshot} from '@portabletext/io/testing'
import {useState} from 'react'
import type {Applicability} from './applicable'
import {useOpenDetails} from './drawers'
import {quoted} from './gherkin'
import {describeSource} from './narration'
import {
  Badge,
  Button,
  DetailsLink,
  Empty,
  ItemList,
  Label,
  plural,
  Revision,
  RevisionStep,
  Section,
  TextInput,
  TextspecValue,
  useFlash,
} from './ui'

type SaveRequest = NetworkSnapshot['saveRequests'][number]

export function ServerPanel({
  server,
  now,
  advanceClock,
  onStep,
  selectedRequests,
  onReceiveSelected,
}: {
  server: ServerSnapshot | null
  /** The virtual clock, in milliseconds. */
  now: number | undefined
  advanceClock: Applicability
  /** Present in free play: runs a `When` step. */
  onStep: ((text: string) => void) | undefined
  /** Save requests picked to be received as one transaction. */
  selectedRequests: Array<SaveRequest>
  onReceiveSelected: () => void
}) {
  const [recreatedAs, setRecreatedAs] = useState('B: bar')
  const flash = useFlash(JSON.stringify(server))
  const openDetails = useOpenDetails()

  return (
    <section
      aria-label="Server"
      className={`flex min-h-0 flex-col gap-3 overflow-auto rounded border border-gray-200 p-3 ${flash}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Server</h2>
        {server ? (
          <span className="text-xs text-gray-500">
            <Label concept="revision">revision</Label>{' '}
            <Revision rev={server.rev} />
          </span>
        ) : null}
        {server && server.nextFailure !== null ? (
          <span className="text-xs text-red-700">
            next request fails with {server.nextFailure}
          </span>
        ) : null}
      </header>

      {server ? (
        <>
          <Section title="value">
            {server.value === null ? (
              <Empty>{server.rev === null ? 'no document' : 'no field'}</Empty>
            ) : (
              <TextspecValue textspec={server.value} blocks={server.blocks} />
            )}
          </Section>

          <Section title="transaction log" concept="transaction">
            {server.transactions.length === 0 ? (
              <Empty>none</Empty>
            ) : (
              <ItemList>
                {server.transactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex flex-wrap items-center gap-1"
                  >
                    <DetailsLink
                      label={`Details of transaction ${transaction.id}`}
                      onClick={() =>
                        openDetails({
                          type: 'transaction',
                          transactionId: transaction.id,
                        })
                      }
                    >
                      {transaction.id}
                    </DetailsLink>
                    <RevisionStep
                      from={transaction.previousRev}
                      to={transaction.resultRev}
                    />
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
            <Section title="server and clock">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  onClick={() =>
                    onStep(
                      'another field of the document is changed on the server',
                    )
                  }
                >
                  other field
                </Button>
                <Button onClick={() => onStep('the document is deleted')}>
                  delete
                </Button>
                <Button
                  onClick={() =>
                    onStep(
                      `the document is recreated as ${quoted(recreatedAs)}`,
                    )
                  }
                >
                  recreate
                </Button>
                <TextInput value={recreatedAs} onChange={setRecreatedAs} />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  onClick={() =>
                    onStep('the wait for the missing transaction runs out')
                  }
                  suggested={advanceClock.suggested !== undefined}
                  title={
                    advanceClock.suggested ??
                    'When the wait for the missing transaction runs out'
                  }
                >
                  advance 10 s
                </Button>
                <span className="font-mono text-xs text-gray-500">
                  t = {(now ?? 0) / 1000} s
                </span>
              </div>
              <div>
                <Button
                  disabled={selectedRequests.length !== 2}
                  title="Tick two save requests in the links first"
                  onClick={onReceiveSelected}
                >
                  receive the two selected as one
                </Button>
              </div>
            </Section>
          ) : null}
        </>
      ) : (
        <Empty>No server yet</Empty>
      )}
    </section>
  )
}
