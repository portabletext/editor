import type {Context} from '@portabletext/editor/test/vitest'

type EditorSnapshotContext = ReturnType<
  Context['editor']['getSnapshot']
>['context']

export type BrowserName = 'chromium' | 'firefox' | 'webkit'

export type EditorName = 'A' | 'B'

export type EvidenceBundle = {
  car: 'core'
  browser: BrowserName
  commit: string
  feature: string
  scenarios: Array<string>
  startedAt: string
  durationMs: number
  completed: boolean
  assertionCount: number
  passed: boolean
  failedStep?: string
  error?: string
  warnings: Array<string>
  unhandledErrors: Array<string>
  results: Array<ScenarioResult>
}

export type ScenarioResult = {
  scenario: string
  startedAt: string
  durationMs: number
  completed: boolean
  assertionCount: number
  passed: boolean
  failedStep?: string
  error?: string
  /**
   * Why the scenario did not run at all.
   */
  notRun?: string
  /**
   * Why the failure checkpoint could not be taken. The failure itself is in
   * `failedStep` and `error`.
   */
  captureError?: string
  warnings: Array<string>
  checkpoints: Array<Checkpoint>
  events: Array<RecordedEvent>
  console: Array<ConsoleEntry>
}

export type Checkpoint = {
  reason: 'capture' | 'failure'
  after: string
  editors: Partial<Record<EditorName, EditorState>>
}

export type EditorState = {
  textspec: string
  value: EditorSnapshotContext['value']
  selection: EditorSnapshotContext['selection']
  domSelection: DomSelection | null
}

export type DomSelection = {
  anchor: DomPoint
  focus: DomPoint
  text: string
}

export type DomPoint = {
  path: Array<string>
  offset: number
}

export type RecordedEvent = {
  t: number
  step: number
  editor: EditorName
  type: string
  [field: string]: unknown
}

export type ConsoleEntry = {
  t: number
  step: number
  level: 'error' | 'warn'
  message: string
}

export type RacetrackReport =
  | {type: 'scenario'; result: ScenarioResult}
  | {type: 'compile error'; error: string}

export function assembleBundle({
  browser,
  commit,
  feature,
  startedAt,
  durationMs,
  results,
  runError,
  unhandledErrors,
}: {
  browser: BrowserName
  commit: string
  feature: string
  startedAt: Date
  durationMs: number
  results: Array<ScenarioResult>
  runError: string | undefined
  unhandledErrors: Array<string>
}): EvidenceBundle {
  const firstFailure = results.find((result) => result.error !== undefined)
  const warnings = results.flatMap((result) =>
    results.length === 1
      ? result.warnings
      : result.warnings.map((warning) => `${result.scenario}: ${warning}`),
  )
  const errors = [
    ...(runError !== undefined ? [runError] : []),
    ...(firstFailure?.error !== undefined ? [firstFailure.error] : []),
    ...unhandledErrors.map((error) => `Unhandled error: ${error}`),
  ]
  const ranCleanly =
    runError === undefined && unhandledErrors.length === 0 && results.length > 0

  return {
    car: 'core',
    browser,
    commit,
    feature,
    scenarios: results.map((result) => result.scenario),
    startedAt: startedAt.toISOString(),
    durationMs,
    completed: ranCleanly && results.every((result) => result.completed),
    assertionCount: results.reduce(
      (count, result) => count + result.assertionCount,
      0,
    ),
    passed: ranCleanly && results.every((result) => result.passed),
    ...(firstFailure?.failedStep !== undefined
      ? {failedStep: firstFailure.failedStep}
      : {}),
    ...(errors.length > 0 ? {error: errors.join('\n')} : {}),
    warnings,
    unhandledErrors,
    results,
  }
}
