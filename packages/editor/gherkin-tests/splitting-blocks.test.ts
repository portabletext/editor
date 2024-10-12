import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../gherkin-spec/gherkin-parameter-types'
import splittingBlocksFeature from '../gherkin-spec/splitting-blocks.feature?raw'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: splittingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
