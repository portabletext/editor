/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import annotationsAcrossBlocks from './annotations-across-blocks.feature'
import annotationsEdgeCases from './annotations-edge-cases.feature'
import annotationsOverlappingDecorators from './annotations-overlapping-decorators.feature'
import annotationsOverlapping from './annotations-overlapping.feature'
import annotations from './annotations.feature'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotations,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsAcrossBlocks,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlapping,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingDecorators,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsEdgeCases,
  stepDefinitions,
  parameterTypes,
})
