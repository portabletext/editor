// thumbjar-test-count: 9
import {readFileSync} from 'node:fs'
import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../scripts/gherkin.ts'

Feature({
  featureText: readFileSync(
    new URL('../../gherkin-spec/insert.break.feature', import.meta.url),
    'utf8',
  ),
  ...deviceDefinitions(),
})
