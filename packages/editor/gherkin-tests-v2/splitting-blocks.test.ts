import {Feature} from 'racejar/vitest'
import splittingBlocksFeature from '../gherkin-spec/splitting-blocks.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: splittingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
