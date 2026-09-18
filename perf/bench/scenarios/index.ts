import {decoratorHeavyScenario} from './decorator-heavy'
import {hugeDocScenario} from './huge-doc'
import {plainScenario} from './plain'
import type {Scenario} from './types'

export type {Scenario} from './types'

export const scenarios: Scenario[] = [
  plainScenario,
  hugeDocScenario,
  decoratorHeavyScenario,
]

export function getScenario(name: string): Scenario {
  const scenario = scenarios.find((candidate) => candidate.name === name)
  if (!scenario) {
    const knownNames = scenarios.map((candidate) => candidate.name).join(', ')
    throw new Error(
      `Unknown scenario "${name}". Known scenarios: ${knownNames}`,
    )
  }
  return scenario
}

export function countBlocks(scenario: Scenario): number {
  return scenario.initialValue.length
}
