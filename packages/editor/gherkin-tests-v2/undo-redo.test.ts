import {Feature} from 'racejar/vitest'
import undoRedoFeature from '../gherkin-spec/undo-redo.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
})
