import {Feature} from 'racejar/vitest'
import insertBlocksFeature from '../gherkin-spec/insert.blocks.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: insertBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
