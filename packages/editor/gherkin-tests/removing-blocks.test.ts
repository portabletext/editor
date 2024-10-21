import {Feature} from '@sanity/gherkin-driver/vitest'
import removingBlocksFeature from '../gherkin-spec/removing-blocks.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: removingBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
