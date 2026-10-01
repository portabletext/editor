import {
  createWorld,
  editorNames,
  type EditorName,
  type HostShape,
  type ServerCopyName,
  type World,
} from '@portabletext/io/testing'
import {useState} from 'react'
import {
  applicableActions,
  editorPrompts,
  type EditorApplicability,
} from './applicable'
import {
  formatScenario,
  formatSteps,
  inEditor,
  quoted,
  runStep,
  type LoggedStep,
  type StepKeyword,
} from './gherkin'
import {narrateStep, type NarrationEntry} from './narration'
import {NarrationLog} from './narration-log'
import {ActionButton, Button, Prompts, Section, TextInput} from './ui'

type Setup = {
  mode: 'the document is' | 'editors in their first commit'
  textspec: string
  serverCopy: 'textspec' | ServerCopyName
  hosts: HostShape
}

type FreePlay = {
  world: World
  log: Array<LoggedStep>
  narration: Array<NarrationEntry>
  error: string | null
}

const setupModes: Array<Setup['mode']> = [
  'the document is',
  'editors in their first commit',
]

const hostShapes: Record<HostShape, {label: string; step: string | null}> = {
  'plain': {label: 'plain hosts', step: null},
  'folding': {
    label: 'folding hosts',
    step: 'hosts that fold batches into shared requests',
  },
  'self-confirming': {
    label: 'self-confirming hosts',
    step: 'hosts that confirm each batch themselves',
  },
}

const hostShapeNames: Array<HostShape> = ['plain', 'folding', 'self-confirming']

const serverCopies: Array<Setup['serverCopy']> = [
  'textspec',
  'no document',
  'no field',
  'an empty list',
]

const styles = ['normal', 'h1', 'h2', 'h3']

export function useFreePlay() {
  const [setup, setSetup] = useState<Setup>({
    mode: 'the document is',
    textspec: 'B: foo|',
    serverCopy: 'textspec',
    hosts: 'plain',
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
      setFreePlay((current) => ({
        ...current,
        log: [...current.log, {keyword, text}],
        narration: [...current.narration, ...entries],
        error: null,
      }))
      return true
    } catch (error) {
      const entries = narrateNow()
      setFreePlay((current) => ({
        ...current,
        narration: [...current.narration, ...entries],
        error: `${keyword} ${text}: ${error instanceof Error ? error.message : String(error)}`,
      }))
      return false
    }
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

    const server = snapshot.server

    if (server) {
      if (server.value === null) {
        checks.push(
          server.rev === null
            ? 'the server has no document'
            : 'the server has no field',
        )
      } else {
        checks.push(
          server.value === ''
            ? 'the server has an empty list'
            : `the server has ${quoted(server.value)}`,
        )
      }
    }

    for (const check of checks) {
      perform('Then', check)
    }
  }

  return {
    world: freePlay.world,
    log: freePlay.log,
    narration: freePlay.narration,
    error: freePlay.error,
    setup,
    setSetup,
    reset: () => setFreePlay(startFreePlay(setup)),
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
        />
      ))}

      <div className="flex min-h-0 flex-col gap-2">
        <Section title="Setup">
          <div className="flex flex-wrap items-center gap-1">
            <select
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
              value={setup.hosts}
              onChange={(event) =>
                setSetup({
                  ...setup,
                  hosts:
                    hostShapeNames.find(
                      (shape) => shape === event.target.value,
                    ) ?? 'plain',
                })
              }
            >
              {hostShapeNames.map((shape) => (
                <option key={shape} value={shape}>
                  {hostShapes[shape].label}
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
}: {
  name: EditorName
  actions: EditorApplicability
  readOnly: boolean
  /** The batch whose outcome a resync carries. */
  inFlightBatchNumber: number | undefined
  onStep: (text: string) => void
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

    return {world, log, narration, error: null}
  } catch (error) {
    return {
      world,
      log,
      narration,
      error: `Setup: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function setupSteps(setup: Setup): Array<string> {
  const hostStep = hostShapes[setup.hosts].step

  return [...(hostStep === null ? [] : [hostStep]), ...editorSetupSteps(setup)]
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
