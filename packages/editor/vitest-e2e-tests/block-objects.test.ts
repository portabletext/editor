import {Feature} from '@sanity/gherkin-driver/vitest'
import blockObjectsFeature from '../e2e-tests/__tests__/block-objects.feature?raw'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: blockObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
