import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import decoratorsFeature from '../gherkin-spec/decorators.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: decoratorsFeature,
  stepDefinitions,
  parameterTypes,
})
