import {Feature} from 'racejar/vitest'
import removingBlocksFeature from '../gherkin-spec/removing-blocks.feature?raw'
import {parameterTypes} from '../gherkin-tests/gherkin-parameter-types'
import {stepDefinitions} from '../gherkin-tests/gherkin-step-definitions'

Feature({
  featureText: removingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
