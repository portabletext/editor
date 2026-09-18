import {scenarios} from '../scenarios'

export function resolveScenarioNames(
  requested: string[] | undefined,
  all: boolean | undefined,
): string[] {
  if (all || !requested || requested.length === 0) {
    return scenarios.map((scenario) => scenario.name)
  }
  return requested
}
