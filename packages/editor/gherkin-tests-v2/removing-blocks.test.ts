import {Feature} from 'racejar/vitest'
import removingBlocksFeature from '../gherkin-spec/removing-blocks.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: removingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
