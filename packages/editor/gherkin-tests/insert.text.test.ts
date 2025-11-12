import {Feature} from 'racejar/vitest'
import insertTextFeature from '../gherkin-spec/insert.text.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: insertTextFeature,
  stepDefinitions,
  parameterTypes,
})
