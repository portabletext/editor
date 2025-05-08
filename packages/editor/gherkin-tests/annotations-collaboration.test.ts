import {Feature} from 'racejar/vitest'
import annotationsCollaborationFeature from '../gherkin-spec/annotations-collaboration.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotationsCollaborationFeature,
  stepDefinitions,
  parameterTypes,
})
