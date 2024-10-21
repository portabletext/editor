import {Feature} from '@sanity/gherkin-driver/vitest'
import splittingBlocksFeature from '../gherkin-spec/splitting-blocks.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: splittingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
