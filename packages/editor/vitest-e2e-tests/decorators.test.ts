import {Feature} from '@sanity/gherkin-driver/vitest'
import decoratorsFeature from '../e2e-tests/__tests__/decorators.feature?raw'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: decoratorsFeature,
  stepDefinitions,
  parameterTypes,
})
