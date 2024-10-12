import {Feature} from '@sanity/gherkin-driver/vitest'
import decoratorsFeature from '../gherkin-spec/decorators.feature?raw'
import {parameterTypes} from '../gherkin-spec/gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: decoratorsFeature,
  stepDefinitions,
  parameterTypes,
})
