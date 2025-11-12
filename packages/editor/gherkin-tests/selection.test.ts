import {Feature} from 'racejar/vitest'
import selectionFeature from '../gherkin-spec/selection.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: selectionFeature,
  stepDefinitions,
  parameterTypes,
})
