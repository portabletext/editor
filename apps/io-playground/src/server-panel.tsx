import type {
  EditorSnapshot,
  NetworkSnapshot,
  ServerSnapshot,
} from '@portabletext/io/testing'
import {useState} from 'react'
import type {Applicability} from './applicable'
import {floorRules} from './concepts'
import {useOpenDetails} from './drawers'
import {quoted} from './gherkin'
import {describeSource} from './narration'
import {
  ActionButton,
  Badge,
  Button,
  DetailsLink,
  Empty,
  InfoMark,
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
  editorA,
  editorADeadFeed,
  carriesServerCopy,
  onToggleServerCopy,
}: {
  server: ServerSnapshot | null
  /** The virtual clock, in milliseconds. */
  now: number | undefined
  advanceClock: Applicability
  /** Present in free play: runs a `When` step and tells whether it succeeded. */
  onStep: ((text: string) => boolean) | undefined
  /** Save requests picked to be received as one transaction. */
  selectedRequests: Array<SaveRequest>
  onReceiveSelected: () => void
  /** The editor the malformed-content doors lead to. */
  editorA: EditorSnapshot | undefined
  editorADeadFeed: boolean
  /** Whether each transaction reaches the hosts with the server's copy. */
  carriesServerCopy: boolean
  /** Present in free play: restarts it with the listener sending the copy, or not. */
  onToggleServerCopy: ((on: boolean) => void) | undefined
}) {
  const [recreatedAs, setRecreatedAs] = useState('B: bar')
  const [scriptValue, setScriptValue] = useState('B: baz')
  const keys = (server?.blocks ?? []).flatMap((block) =>
    typeof block === 'object' &&
    block !== null &&
    typeof block._key === 'string'
      ? [block._key]
      : [],
  )
  const [chosenKey, setChosenKey] = useState<string | undefined>(undefined)
  const corruptedKey =
    chosenKey !== undefined && keys.includes(chosenKey)
      ? chosenKey
      : keys.at(-1)
  const [corruption, setCorruption] = useState<string>(floorRules[0].phrase)
  const doors = malformedDoors(editorA, editorADeadFeed, corruptedKey)
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

      <label
        title={
          onToggleServerCopy === undefined
            ? "set by the scenario's Given"
            : 'changing it restarts free play'
        }
        className="flex items-center gap-1 text-xs text-gray-700"
      >
        <input
          type="checkbox"
          checked={carriesServerCopy}
          disabled={onToggleServerCopy === undefined}
          onChange={(event) => onToggleServerCopy?.(event.target.checked)}
        />
        <span>listener sends the document with each transaction</span>
        <InfoMark concept="transaction.value" />
      </label>

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
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  onClick={() =>
                    onStep(`a script sets the field to ${quoted(scriptValue)}`)
                  }
                >
                  a script sets the field
                </Button>
                <TextInput value={scriptValue} onChange={setScriptValue} />
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

          {onStep ? (
            <Section
              title="malformed content"
              suffix={<>· corrupt the stored copy, then pick a door</>}
            >
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-gray-500">block</span>
                <select
                  aria-label="block to corrupt"
                  className="rounded border border-gray-300 bg-white px-1 py-0.5 font-mono text-xs"
                  value={corruptedKey ?? ''}
                  onChange={(event) => setChosenKey(event.target.value)}
                >
                  {keys.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="corruption"
                  className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
                  value={corruption}
                  onChange={(event) => setCorruption(event.target.value)}
                >
                  {floorRules.map((rule) => (
                    <option key={rule.phrase} value={rule.phrase}>
                      {rule.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <ActionButton
                  applicability={doors.reload}
                  onClick={() => {
                    if (
                      corruptedKey !== undefined &&
                      onStep(
                        `the server's copy changes without a transaction so its block ${quoted(corruptedKey)} ${corruption}`,
                      )
                    ) {
                      onStep(
                        editorA?.inFlight
                          ? `Editor A is resynced with the outcome of mutation ${editorA.inFlight.mutationNumber}`
                          : 'Editor A is resynced',
                      )
                    }
                  }}
                >
                  reload Editor A from the server
                </ActionButton>
                <ActionButton
                  applicability={doors.transaction}
                  onClick={() => {
                    if (
                      corruptedKey !== undefined &&
                      onStep(
                        `a script changes the server's block ${quoted(corruptedKey)} so it ${corruption}`,
                      )
                    ) {
                      onStep("Editor A receives the script's corruption")
                    }
                  }}
                >
                  deliver it as a transaction
                </ActionButton>
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

function malformedDoors(
  editor: EditorSnapshot | undefined,
  deadFeed: boolean,
  key: string | undefined,
): {reload: Applicability; transaction: Applicability} {
  if (key === undefined) {
    const noBlock = {
      enabled: false,
      why: 'the server has no block with a key to corrupt',
    }

    return {reload: noBlock, transaction: noBlock}
  }

  if (editor?.status !== 'ready') {
    const notReady = {enabled: false, why: "Editor A isn't ready"}

    return {reload: notReady, transaction: notReady}
  }

  if (editor.io.sync === 'out of step') {
    return {
      reload: {
        enabled: true,
        why: "the server's copy changes without a transaction, and Editor A resyncs from it",
      },
      transaction: {
        enabled: false,
        why: 'Editor A is out of step and ignores transactions: resync first',
      },
    }
  }

  return {
    reload: {
      enabled: true,
      why: "the server's copy changes without a transaction, and Editor A resyncs from it: io repairs the copy and sends the repair as its next mutation",
    },
    transaction:
      editor.host === 'self-confirming'
        ? {
            enabled: false,
            why: "Editor A's host has no listener, so a script's transaction never reaches it",
          }
        : deadFeed
          ? {
              enabled: false,
              why: "Editor A's feed is dead: the transaction would never arrive",
            }
          : {
              enabled: true,
              why: 'a script corrupts the block as a transaction, and Editor A receives it: `error: invalid content`, out of step until a resync',
            },
  }
}
