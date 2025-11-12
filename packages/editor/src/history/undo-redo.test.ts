import {Feature} from 'racejar/vitest'
import {parameterTypes} from '../test'
import {stepDefinitions} from '../test/vitest'
import undoRedoFeature from './undo-redo.feature?raw'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
})
