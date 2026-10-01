import {
  createWorld,
  editorNames,
  type EditorName,
  type EditorSnapshot,
  type HostShape,
  type ServerCopyName,
  type World,
  type WorldSnapshot,
} from '@portabletext/io/testing'
import {useState} from 'react'
import {
  applicableActions,
  editorPrompts,
  type Applicability,
  type EditorApplicability,
} from './applicable'
import {hostPresetOf, hostPresets} from './concepts'
import {
  formatScenario,
  formatSteps,
  inEditor,
  quoted,
  runStep,
  serverChecks,
  type LoggedStep,
  type StepKeyword,
} from './gherkin'
import {narrateStep, type NarrationEntry} from './narration'
import {NarrationLog} from './narration-log'
import {ActionButton, Badge, Button, Prompts, Section, TextInput} from './ui'

type Setup = {
  mode: 'the document is' | 'editors in their first commit'
  textspec: string
  serverCopy: 'textspec' | ServerCopyName
  hosts: HostShape
  transactionsCarryCopy: boolean
}

type FreePlay = {
  world: World
  log: Array<LoggedStep>
  narration: Array<NarrationEntry>
  error: string | null
  /** Editors whose listener the network has stopped delivering to. */
  deadFeeds: Array<EditorName>
  /** When each editor sent each batch, on the world's clock, by batch number. */
  sentAt: Record<EditorName, Array<number>>
}

const setupModes: Array<Setup['mode']> = [
  'the document is',
  'editors in their first commit',
]

const serverCopies: Array<Setup['serverCopy']> = [
  'textspec',
  'no document',
  'no field',
  'an empty list',
]

const styles = ['normal', 'h1', 'h2', 'h3']

export function useFreePlay() {
  const [setup, setSetup] = useState<Setup>({
    mode: 'editors in their first commit',
    textspec: 'B: foo',
    serverCopy: 'textspec',
    hosts: 'plain',
    transactionsCarryCopy: false,
  })
  const [freePlay, setFreePlay] = useState<FreePlay>(() => startFreePlay(setup))

  function perform(keyword: StepKeyword, text: string): boolean {
    const {world} = freePlay
    const before = world.snapshot()
    const narrateNow = () =>
      narrateStep({
        step: `${keyword} ${text}`,
        isAction: keyword === 'When',
        before,
        after: world.snapshot(),
      })

    try {
      runStep(world, {keyword, text})
      const entries = narrateNow()
      const after = world.snapshot()
      setFreePlay((current) => ({
        ...current,
        log: [...current.log, {keyword, text}],
        narration: [...current.narration, ...entries],
        error: null,
        sentAt: recordSends(current.sentAt, after),
      }))
      return true
    } catch (error) {
      const entries = narrateNow()
      const after = world.snapshot()
      setFreePlay((current) => ({
        ...current,
        narration: [...current.narration, ...entries],
        error: `${keyword} ${text}: ${error instanceof Error ? error.message : String(error)}`,
        sentAt: recordSends(current.sentAt, after),
      }))
      return false
    }
  }

  function note(step: string, sentences: Array<string>) {
    setFreePlay((current) => ({
      ...current,
      narration: [...current.narration, {step, sentences}],
    }))
  }

  function setFeedDead(name: EditorName, dead: boolean) {
    setFreePlay((current) => ({
      ...current,
      deadFeeds: dead
        ? [...current.deadFeeds.filter((candidate) => candidate !== name), name]
        : current.deadFeeds.filter((candidate) => candidate !== name),
    }))
  }

  function killFeed(name: EditorName) {
    setFeedDead(name, true)
    note(`(${name}'s feed dies)`, [
      `The network stops delivering to ${name}'s listener. Nothing tells the host or io: transactions pile up unheard, and a batch in flight never comes back.`,
    ])
  }

  function sayFeedLost(name: EditorName) {
    const inFlight = freePlay.world.snapshot().editors?.[name].inFlight

    if (!perform('When', `${name}'s feed is lost`)) {
      return
    }

    perform(
      'When',
      inFlight
        ? `${name} is resynced with the outcome of batch ${inFlight.batchNumber}`
        : `${name} is resynced`,
    )
    setFeedDead(name, false)
  }

  function doNothing(name: EditorName) {
    if (!perform('When', '10 seconds pass')) {
      return
    }

    const snapshot = freePlay.world.snapshot()
    const editor = snapshot.editors?.[name]
    const elapsed = editor ? savingFor(name, snapshot) : undefined

    note(`(${name}'s host does nothing)`, [
      editor?.inFlight && elapsed !== undefined
        ? `${name}'s host never notices. Batch ${editor.inFlight.batchNumber} has been in flight for ${elapsed / 1000} s and sync still says ${editor.sync}. The protocol has no stalled state to show: what a user sees when a save never comes back is still an open question.`
        : `${name}'s host never notices, and sync says ${editor?.sync ?? 'nothing'}.`,
    ])
  }

  function savingFor(
    name: EditorName,
    snapshot = freePlay.world.snapshot(),
  ): number | undefined {
    const inFlight = snapshot.editors?.[name].inFlight
    const sentAt =
      inFlight === null || inFlight === undefined
        ? undefined
        : recordSends(freePlay.sentAt, snapshot)[name][inFlight.batchNumber - 1]

    return sentAt === undefined || snapshot.network === null
      ? undefined
      : snapshot.network.now - sentAt
  }

  function captureChecks() {
    const snapshot = freePlay.world.snapshot()
    const checks: Array<string> = []

    for (const name of editorNames) {
      const editor = snapshot.editors?.[name]

      if (editor) {
        checks.push(`${name} shows ${quoted(editor.screen)}`)
      }
    }

    const server = snapshot.server ? serverChecks(snapshot.server) : undefined

    for (const check of [...checks, ...(server?.checks ?? [])]) {
      perform('Then', check)
    }

    if (server?.omitted) {
      note('(capture checks)', [server.omitted])
    }
  }

  return {
    world: freePlay.world,
    log: freePlay.log,
    narration: freePlay.narration,
    error: freePlay.error,
    deadFeeds: freePlay.deadFeeds,
    killFeed,
    sayFeedLost,
    doNothing,
    savingFor,
    setup,
    setSetup,
    reset: () => setFreePlay(startFreePlay(setup)),
    resetWith: (next: Setup) => setFreePlay(startFreePlay(next)),
    setTransactionsCarryCopy: (transactionsCarryCopy: boolean) => {
      const next = {...setup, transactionsCarryCopy}
      setSetup(next)
      setFreePlay(startFreePlay(next))
    },
    perform,
    captureChecks,
  }
}

export function FreePlayTab({
  freePlay,
}: {
  freePlay: ReturnType<typeof useFreePlay>
}) {
  const {setup, setSetup} = freePlay
  const [scenarioName, setScenarioName] = useState('Free play')
  const [copied, setCopied] = useState(false)
  const scenarioText = formatScenario(scenarioName, freePlay.log)
  const snapshot = freePlay.world.snapshot()

  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_1fr_1.2fr_1.2fr] gap-4">
      {editorNames.map((name) => (
        <EditorControls
          key={name}
          name={name}
          actions={applicableActions(snapshot, name)}
          readOnly={snapshot.editors?.[name].readOnly ?? false}
          inFlightBatchNumber={snapshot.editors?.[name].inFlight?.batchNumber}
          onStep={(text) => freePlay.perform('When', text)}
          feed={{
            dead: freePlay.deadFeeds.includes(name),
            dies: feedDiesApplicability(snapshot, name),
            onDies: () => freePlay.killFeed(name),
            onSayFeedLost: () => freePlay.sayFeedLost(name),
            onDoNothing: () => freePlay.doNothing(name),
          }}
        />
      ))}

      <div className="flex min-h-0 flex-col gap-2">
        <Section title="Setup">
          <div className="flex flex-wrap items-center gap-1">
            <select
              aria-label="host preset"
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
              value={setup.hosts}
              onChange={(event) => {
                const next = {
                  ...setup,
                  hosts:
                    hostPresets.find(
                      (preset) => preset.shape === event.target.value,
                    )?.shape ?? 'plain',
                }
                setSetup(next)
                freePlay.resetWith(next)
              }}
            >
              {hostPresets.map((preset) => (
                <option key={preset.shape} value={preset.shape}>
                  {preset.label}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
              value={setup.mode}
              onChange={(event) =>
                setSetup({
                  ...setup,
                  mode:
                    setupModes.find((mode) => mode === event.target.value) ??
                    'the document is',
                })
              }
            >
              {setupModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
            {setup.mode === 'the document is' ? null : (
              <select
                className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
                value={setup.serverCopy}
                onChange={(event) =>
                  setSetup({
                    ...setup,
                    serverCopy:
                      serverCopies.find(
                        (copy) => copy === event.target.value,
                      ) ?? 'textspec',
                  })
                }
              >
                {serverCopies.map((copy) => (
                  <option key={copy} value={copy}>
                    {copy === 'textspec' ? 'the server has' : copy}
                  </option>
                ))}
              </select>
            )}
            {setup.mode === 'the document is' ||
            setup.serverCopy === 'textspec' ? (
              <TextInput
                value={setup.textspec}
                onChange={(textspec) => setSetup({...setup, textspec})}
                width="w-40"
              />
            ) : null}
            <Button onClick={freePlay.reset}>reset</Button>
          </div>
        </Section>

        <Section title="Gherkin log" className="min-h-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <TextInput
              value={scenarioName}
              onChange={setScenarioName}
              width="w-40"
            />
            <Button onClick={freePlay.captureChecks}>capture checks</Button>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(scenarioText).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                })
              }}
            >
              {copied ? 'copied' : 'copy as scenario'}
            </Button>
          </div>
          {freePlay.error ? (
            <p className="font-mono text-xs text-red-700">{freePlay.error}</p>
          ) : null}
          <pre className="min-h-0 flex-1 overflow-auto rounded bg-white p-2 font-mono text-xs ring-1 ring-gray-200">
            {formatSteps(freePlay.log).join('\n')}
          </pre>
        </Section>
      </div>

      <div className="min-h-0 overflow-auto">
        <NarrationLog entries={freePlay.narration} />
      </div>
    </div>
  )
}

function EditorControls({
  name,
  actions,
  readOnly,
  inFlightBatchNumber,
  onStep,
  feed,
}: {
  name: EditorName
  actions: EditorApplicability
  readOnly: boolean
  /** The batch whose outcome a resync carries. */
  inFlightBatchNumber: number | undefined
  onStep: (text: string) => void
  feed: {
    dead: boolean
    dies: Applicability
    onDies: () => void
    onSayFeedLost: () => void
    onDoNothing: () => void
  }
}) {
  const [typed, setTyped] = useState('x')
  const [style, setStyle] = useState('h1')
  const [caretAfter, setCaretAfter] = useState('foo')
  const [insertedBlock, setInsertedBlock] = useState('B: bar')
  const [deletedBlock, setDeletedBlock] = useState('foo')
  const [deletedText, setDeletedText] = useState('x')
  const suffix = inEditor(name)

  return (
    <Section title={name}>
      <div className="flex flex-col gap-1">
        <Prompts prompts={editorPrompts(actions)} />
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions.type}
            onClick={() => onStep(`${quoted(typed)} is typed${suffix}`)}
          >
            type
          </ActionButton>
          <TextInput value={typed} onChange={setTyped} />
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions['set style']}
            onClick={() =>
              onStep(`the style is set to ${quoted(style)}${suffix}`)
            }
          >
            set style
          </ActionButton>
          <select
            className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
            value={style}
            onChange={(event) => setStyle(event.target.value)}
          >
            {styles.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions['put caret after']}
            onClick={() =>
              onStep(`the caret is put after ${quoted(caretAfter)}${suffix}`)
            }
          >
            put caret after
          </ActionButton>
          <TextInput value={caretAfter} onChange={setCaretAfter} />
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions['insert block']}
            onClick={() =>
              onStep(`the block ${quoted(insertedBlock)} is inserted${suffix}`)
            }
          >
            insert block
          </ActionButton>
          <TextInput value={insertedBlock} onChange={setInsertedBlock} />
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions['delete block']}
            onClick={() =>
              onStep(`the block ${quoted(deletedBlock)} is deleted${suffix}`)
            }
          >
            delete block
          </ActionButton>
          <TextInput value={deletedBlock} onChange={setDeletedBlock} />
        </div>
        <div className="flex items-center gap-1">
          <ActionButton
            applicability={actions['delete before caret']}
            onClick={() =>
              onStep(
                `${quoted(deletedText)} is deleted before the caret${suffix}`,
              )
            }
          >
            delete before caret
          </ActionButton>
          <TextInput value={deletedText} onChange={setDeletedText} />
        </div>
        <div className="flex flex-wrap gap-1">
          <ActionButton
            applicability={actions.undo}
            onClick={() => onStep(`undo is performed${suffix}`)}
          >
            undo
          </ActionButton>
          <ActionButton
            applicability={actions['read-only']}
            onClick={() => onStep(`${name} becomes read-only`)}
          >
            read-only: {readOnly ? 'on' : 'off'}
          </ActionButton>
          <ActionButton
            applicability={actions.close}
            onClick={() => onStep(`${name} is closed`)}
          >
            {actions.close.enabled ? 'close' : 'closed'}
          </ActionButton>
        </div>
        <div className="flex flex-wrap gap-1">
          <ActionButton
            applicability={actions.resync}
            onClick={() =>
              onStep(
                inFlightBatchNumber === undefined
                  ? `${name} is resynced`
                  : `${name} is resynced with the outcome of batch ${inFlightBatchNumber}`,
              )
            }
          >
            {inFlightBatchNumber === undefined
              ? 'resync'
              : `resync with outcome of batch ${inFlightBatchNumber}`}
          </ActionButton>
          <ActionButton
            applicability={actions['resync discarding']}
            onClick={() =>
              onStep(`${name} is resynced, discarding unsent changes`)
            }
          >
            load saved version (discard unsent)
          </ActionButton>
          <ActionButton
            applicability={actions.load}
            onClick={() => onStep(`${name} is loaded`)}
          >
            load
          </ActionButton>
          <ActionButton
            applicability={actions['end first commit']}
            onClick={() => onStep(`${name}'s first commit ends`)}
          >
            end first commit
          </ActionButton>
          {actions.load.enabled ? null : (
            <span className="text-xs text-gray-400">
              load: {actions.load.why}
            </span>
          )}
        </div>
        <div
          aria-label={`${name}'s feed`}
          className="flex flex-wrap items-center gap-1"
        >
          {feed.dead ? (
            <>
              <Badge tone="red">feed dead</Badge>
              <span className="text-xs text-gray-500">the host can:</span>
              <Button
                suggested
                onClick={feed.onSayFeedLost}
                title={
                  inFlightBatchNumber === undefined
                    ? 'feed lost, then a resync'
                    : `feed lost, then re-submit batch ${inFlightBatchNumber}'s frozen request and resync with its outcome`
                }
              >
                say feed lost
              </Button>
              <Button
                onClick={feed.onDoNothing}
                title="10 seconds pass, and the host never notices"
              >
                do nothing
              </Button>
            </>
          ) : (
            <ActionButton applicability={feed.dies} onClick={feed.onDies}>
              the feed dies
            </ActionButton>
          )}
        </div>
      </div>
    </Section>
  )
}

function startFreePlay(setup: Setup): FreePlay {
  const world = createWorld()
  const log: Array<LoggedStep> = []
  const narration: Array<NarrationEntry> = []

  try {
    for (const text of setupSteps(setup)) {
      const before = world.snapshot()
      runStep(world, {keyword: 'Given', text})
      log.push({keyword: 'Given', text})
      narration.push(
        ...narrateStep({
          step: `Given ${text}`,
          isAction: false,
          before,
          after: world.snapshot(),
        }),
      )
    }

    return {
      world,
      log,
      narration,
      error: null,
      deadFeeds: [],
      sentAt: recordSends(noSends, world.snapshot()),
    }
  } catch (error) {
    return {
      world,
      log,
      narration,
      error: `Setup: ${error instanceof Error ? error.message : String(error)}`,
      deadFeeds: [],
      sentAt: recordSends(noSends, world.snapshot()),
    }
  }
}

function feedDiesApplicability(
  snapshot: WorldSnapshot,
  name: EditorName,
): Applicability {
  const editor = snapshot.editors?.[name]

  if (!editor) {
    return {enabled: false, why: 'there are no editors yet'}
  }

  if (editor.status !== 'ready') {
    return {enabled: false, why: 'the feed runs only while the editor is ready'}
  }

  if (editor.host === 'self-confirming') {
    return {
      enabled: false,
      why: 'the host has no listener, so there is no feed to die',
    }
  }

  return editor.outOfStep
    ? {enabled: false, why: 'the editor is out of step already: resync'}
    : {
        enabled: true,
        why: 'the network stops delivering to the listener, and nothing tells the host',
      }
}

const noSends: Record<EditorName, Array<number>> = {
  'Editor A': [],
  'Editor B': [],
}

function recordSends(
  sentAt: Record<EditorName, Array<number>>,
  snapshot: WorldSnapshot,
): Record<EditorName, Array<number>> {
  const {editors, network} = snapshot

  if (!editors || !network) {
    return sentAt
  }

  return {
    'Editor A': stamp(sentAt['Editor A'], editors['Editor A'], network.now),
    'Editor B': stamp(sentAt['Editor B'], editors['Editor B'], network.now),
  }
}

function stamp(
  times: Array<number>,
  editor: EditorSnapshot,
  now: number,
): Array<number> {
  return editor.sentBatches.length > times.length
    ? [...times, ...editor.sentBatches.slice(times.length).map(() => now)]
    : times
}

function setupSteps(setup: Setup): Array<string> {
  const hostStep = hostPresetOf(setup.hosts).step

  return [
    ...(hostStep === null ? [] : [hostStep]),
    ...(setup.transactionsCarryCopy
      ? ["transactions that carry the server's copy"]
      : []),
    ...editorSetupSteps(setup),
  ]
}

function editorSetupSteps(setup: Setup): Array<string> {
  if (setup.mode === 'the document is') {
    return [`the document is ${quoted(setup.textspec)}`]
  }

  return [
    setup.serverCopy === 'textspec'
      ? `the server has ${quoted(setup.textspec)}`
      : `the server has ${setup.serverCopy}`,
    'the editors are in their first commit',
  ]
}
