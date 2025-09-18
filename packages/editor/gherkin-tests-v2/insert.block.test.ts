import {Feature} from 'racejar/vitest'
import insertBlockFeature from '../gherkin-spec/insert.block.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: insertBlockFeature,
  stepDefinitions,
  parameterTypes,
})
