import {Feature} from 'racejar/vitest'
import annotationsCollaborationFeature from '../gherkin-spec/annotations-collaboration.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: annotationsCollaborationFeature,
  stepDefinitions,
  parameterTypes,
})
