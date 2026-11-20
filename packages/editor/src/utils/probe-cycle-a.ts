import {probeCycleB} from './probe-cycle-b'

export function probeCycleA(): string {
  return `a${probeCycleB.name}`
}
