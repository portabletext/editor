import {Feature} from 'racejar/vitest'
import rtlFeature from '../gherkin-spec/rtl.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: rtlFeature,
  stepDefinitions,
  parameterTypes,
})
