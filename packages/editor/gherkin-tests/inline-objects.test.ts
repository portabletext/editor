import {Feature} from 'racejar/vitest'
import inlineObjectsFeature from '../gherkin-spec/inline-objects.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: inlineObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
