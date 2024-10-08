import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import splittingBlocksFeature from '../e2e-tests/__tests__/splitting-blocks.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: splittingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
