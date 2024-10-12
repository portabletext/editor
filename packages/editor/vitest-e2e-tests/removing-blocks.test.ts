import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import removingBlocksFeature from '../gherkin-spec/removing-blocks.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: removingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
