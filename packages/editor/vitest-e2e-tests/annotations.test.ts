import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import annotationsAcrossBlocksFeature from '../gherkin-spec/annotations-across-blocks.feature?raw'
import annotationsEdgeCasesFeature from '../gherkin-spec/annotations-edge-cases.feature?raw'
import annotationsOverlappingDecoratorsFeature from '../gherkin-spec/annotations-overlapping-decorators.feature?raw'
import annotationsOverlappingFeature from '../gherkin-spec/annotations-overlapping.feature?raw'
import annotationsFeature from '../gherkin-spec/annotations.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: annotationsFeature,
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
