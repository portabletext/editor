// thumbjar-test-count: 13
import {readFileSync} from 'node:fs'
import type {Scenario} from 'racejar'
import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../scripts/gherkin.ts'

for (const file of ['insert.break', 'insert.text']) {
  Feature({
    featureText: readFileSync(
      new URL(`../../gherkin-spec/${file}.feature`, import.meta.url),
      'utf8',
    ),
    ...deviceDefinitions(),
    ...(file === 'insert.break'
      ? {
          // On Android, Enter over a full selection leaves an extra empty block.
          expectFail: (scenario: Scenario) =>
            scenario.name ===
            'Pressing Enter when selecting the entire content',
        }
      : {}),
  })
}
