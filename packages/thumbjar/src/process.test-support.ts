import {readFileSync} from 'node:fs'

export function processAlive(pid: number) {
  try {
    return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
  } catch {
    return false
  }
}
