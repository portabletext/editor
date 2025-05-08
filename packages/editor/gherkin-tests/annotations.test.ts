import {Feature} from 'racejar/vitest'
import annotationsAcrossBlocksFeature from '../gherkin-spec/annotations-across-blocks.feature?raw'
import annotationsCollaborationFeature from '../gherkin-spec/annotations-collaboration.feature?raw'
import annotationsEdgeCasesFeature from '../gherkin-spec/annotations-edge-cases.feature?raw'
import annotationsOverlappingDecoratorsFeature from '../gherkin-spec/annotations-overlapping-decorators.feature?raw'
import annotationsOverlappingFeature from '../gherkin-spec/annotations-overlapping.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotationsCollaborationFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsAcrossBlocksFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsEdgeCasesFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingDecoratorsFeature,
  stepDefinitions,
  parameterTypes,
})
