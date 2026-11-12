// thumbjar-test-count: 13
import {readFileSync} from 'node:fs'
import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../scripts/gherkin.ts'

for (const file of ['insert.break', 'insert.text']) {
  Feature({
    featureText: readFileSync(
      new URL(`../../gherkin-spec/${file}.feature`, import.meta.url),
      'utf8',
    ),
    ...deviceDefinitions(),
  })
}
