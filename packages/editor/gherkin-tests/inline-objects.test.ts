import {Feature} from 'racejar/vitest'
import inlineObjectsFeature from '../gherkin-spec/inline-objects.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: inlineObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
