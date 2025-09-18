import {Feature} from 'racejar/vitest'
import listsFeature from '../gherkin-spec/lists.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: listsFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
