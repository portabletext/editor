import {
  createWorld,
  editorNames,
  type EditorName,
  type ServerCopyName,
  type World,
} from '@portabletext/io'
import {useState} from 'react'
import {
  formatScenario,
  formatSteps,
  inEditor,
  quoted,
  runStep,
  type LoggedStep,
  type StepKeyword,
} from './gherkin'
import {Button, Section, TextInput} from './ui'

type Setup = {
  mode:
    | 'the document is'
    | 'editors claim the first load'
    | "editors don't claim"
  textspec: string
  serverCopy: 'textspec' | ServerCopyName
}

type FreePlay = {
  world: World
  log: Array<LoggedStep>
  error: string | null
}

const setupModes: Array<Setup['mode']> = [
  'the document is',
  'editors claim the first load',
  "editors don't claim",
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
    mode: 'the document is',
    textspec: 'B: foo|',
    serverCopy: 'textspec',
  })
  const [freePlay, setFreePlay] = useState<FreePlay>(() => startFreePlay(setup))

  function perform(keyword: StepKeyword, text: string): boolean {
    try {
      runStep(freePlay.world, {keyword, text})
      setFreePlay((current) => ({
        ...current,
        log: [...current.log, {keyword, text}],
        error: null,
      }))
      return true
    } catch (error) {
      setFreePlay((current) => ({
        ...current,
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
      } else if (server.value !== '') {
        checks.push(`the server has ${quoted(server.value)}`)
      }
    }

    for (const check of checks) {
      perform('Then', check)
    }
  }

  return {
    world: freePlay.world,
    log: freePlay.log,
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

  return (
    <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-4">
      {editorNames.map((name) => (
        <EditorControls
          key={name}
          name={name}
          onStep={(text) => freePlay.perform('When', text)}
        />
      ))}

      <div className="flex flex-col gap-2">
        <Section title="Setup">
          <div className="flex flex-wrap items-center gap-1">
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

        <Section title="Gherkin log">
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
          <pre className="rounded bg-white p-2 font-mono text-xs ring-1 ring-gray-200">
            {formatSteps(freePlay.log).join('\n')}
          </pre>
        </Section>
      </div>
    </div>
  )
}

function EditorControls({
  name,
  onStep,
}: {
  name: EditorName
  onStep: (text: string) => void
}) {
  const [typed, setTyped] = useState('x')
  const [style, setStyle] = useState('h1')
  const [caretAfter, setCaretAfter] = useState('foo')
  const [insertedBlock, setInsertedBlock] = useState('B: bar')
  const [deletedBlock, setDeletedBlock] = useState('foo')
  const suffix = inEditor(name)

  return (
    <Section title={name}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Button onClick={() => onStep(`${quoted(typed)} is typed${suffix}`)}>
            type
          </Button>
          <TextInput value={typed} onChange={setTyped} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() =>
              onStep(`the style is set to ${quoted(style)}${suffix}`)
            }
          >
            set style
          </Button>
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
          <Button
            onClick={() =>
              onStep(`the caret is put after ${quoted(caretAfter)}${suffix}`)
            }
          >
            put caret after
          </Button>
          <TextInput value={caretAfter} onChange={setCaretAfter} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() =>
              onStep(`the block ${quoted(insertedBlock)} is inserted${suffix}`)
            }
          >
            insert block
          </Button>
          <TextInput value={insertedBlock} onChange={setInsertedBlock} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() =>
              onStep(`the block ${quoted(deletedBlock)} is deleted${suffix}`)
            }
          >
            delete block
          </Button>
          <TextInput value={deletedBlock} onChange={setDeletedBlock} />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button onClick={() => onStep(`undo is performed${suffix}`)}>
            undo
          </Button>
          <Button onClick={() => onStep(`${name} becomes read-only`)}>
            read-only
          </Button>
          <Button onClick={() => onStep(`${name} is closed`)}>close</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button onClick={() => onStep(`${name} is resynced`)}>resync</Button>
          <Button
            onClick={() =>
              onStep(`${name} is resynced, discarding unsent changes`)
            }
          >
            resync, discarding
          </Button>
          <Button onClick={() => onStep(`${name} is loaded`)}>load</Button>
          {name === 'Editor A' ? (
            <Button
              onClick={() => onStep('the claim is released')}
              title="The vocabulary releases Editor A's claim only"
            >
              release claim
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  )
}

function startFreePlay(setup: Setup): FreePlay {
  const world = createWorld()
  const log: Array<LoggedStep> = []

  try {
    for (const text of setupSteps(setup)) {
      runStep(world, {keyword: 'Given', text})
      log.push({keyword: 'Given', text})
    }

    return {world, log, error: null}
  } catch (error) {
    return {
      world,
      log,
      error: `Setup: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function setupSteps(setup: Setup): Array<string> {
  if (setup.mode === 'the document is') {
    return [`the document is ${quoted(setup.textspec)}`]
  }

  return [
    setup.serverCopy === 'textspec'
      ? `the server has ${quoted(setup.textspec)}`
      : `the server has ${setup.serverCopy}`,
    setup.mode === 'editors claim the first load'
      ? 'an editor that claims the first load'
      : "an editor that doesn't claim the first load",
  ]
}
