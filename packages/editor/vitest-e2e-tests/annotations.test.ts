import {Feature} from '@sanity/gherkin-driver/vitest'
import annotationsAcrossBlocksFeature from '../e2e-tests/__tests__/annotations-across-blocks.feature?raw'
import annotationsEdgeCasesFeature from '../e2e-tests/__tests__/annotations-edge-cases.feature?raw'
import annotationsOverlappingDecoratorsFeature from '../e2e-tests/__tests__/annotations-overlapping-decorators.feature?raw'
import annotationsOverlappingFeature from '../e2e-tests/__tests__/annotations-overlapping.feature?raw'
import annotationsFeature from '../e2e-tests/__tests__/annotations.feature?raw'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
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
