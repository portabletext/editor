import {Feature} from 'racejar/vitest'
import listsFeature from '../gherkin-spec/lists.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: listsFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
