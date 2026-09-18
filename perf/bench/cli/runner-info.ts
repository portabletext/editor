import * as os from 'node:os'
import type {Browser} from 'playwright'
import type {RunnerInfo} from './types'

export async function readRunnerInfo(
  browser: Browser,
  calibrationMs: number,
  throttledCalibrationMs: number,
): Promise<RunnerInfo> {
  const cpus = os.cpus()
  return {
    os: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpus: cpus.length,
    cpuModel: cpus[0]?.model ?? 'unknown',
    memoryGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    nodeVersion: process.version,
    chromiumVersion: browser.version(),
    calibrationMs,
    throttledCalibrationMs,
  }
}
