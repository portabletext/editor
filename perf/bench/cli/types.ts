import type {Verdict} from '../stats/gate'
import type {SummaryStats} from '../stats/quantiles'

export interface GitInfo {
  sha: string
  branch: string
  mergeBaseSha?: string
  committedAt: string
  /** `ab` only: the `--from` side's resolved commit (`sha`/`branch`/etc. above describe `--to`). */
  reference?: {
    sha: string
    committedAt: string
  }
}

export interface RunnerInfo {
  os: string
  arch: string
  cpus: number
  cpuModel: string
  memoryGb: number
  nodeVersion: string
  chromiumVersion: string
  /** Unthrottled score from the fixed-work calibration loop (browser.ts). */
  calibrationMs: number
  /** Same loop under `config.cpuThrottleRate` — proof the throttle applied. */
  throttledCalibrationMs: number
}

export interface BenchConfig {
  cpuThrottleRate: number
  /** Present for `self-test` and `ab`: seeds the A/B bootstrap's session resampling. Absent from `run`'s absolute mode, which doesn't resample. */
  seed?: number
  warmupKeystrokes: number
  measuredKeystrokes: number
  cadenceMs: number
}

export interface MetricSide {
  sessions: number[][]
  summary: SummaryStats
  belowFloorCount: number
}

export interface MetricComparison {
  diff: number
  lo: number
  hi: number
  verdict: Verdict
}

export interface BenchMetric {
  label: 'keydown-to-paint'
  unit: 'ms'
  experiment: MetricSide
  reference?: MetricSide
  comparison?: MetricComparison
}

export interface BenchScenarioResult {
  name: string
  source: 'core'
  blockCount: number
  metrics: BenchMetric[]
}

export interface BenchRun {
  schemaVersion: 1
  mode: 'absolute' | 'ab'
  trigger?: 'local' | 'cron' | 'pr' | 'dispatch'
  startedAt: string
  finishedAt: string
  git: GitInfo
  runner: RunnerInfo
  config: BenchConfig
  scenarios: BenchScenarioResult[]
}
