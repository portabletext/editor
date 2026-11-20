import {probeCycleA} from './probe-cycle-a'

export function probeCycleB(): string {
  return `b${probeCycleA.name}`
}
