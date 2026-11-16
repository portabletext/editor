import {Feature} from 'racejar/vitest'
import movingBlocksFeature from '../gherkin-spec/moving-blocks.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: movingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
