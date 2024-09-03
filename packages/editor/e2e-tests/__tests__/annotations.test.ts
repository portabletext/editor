/** @jest-environment ./setup/collaborative.jest.env.ts */

import annotationsAcrossBlocks from './annotations-across-blocks.feature'
import annotationsEdgeCases from './annotations-edge-cases.feature'
import annotationsOverlapping from './annotations-overlapping.feature'
import annotations from './annotations.feature'
import {Feature} from './gherkin-driver'
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
  featureText: annotationsEdgeCases,
  stepDefinitions,
  parameterTypes,
})
