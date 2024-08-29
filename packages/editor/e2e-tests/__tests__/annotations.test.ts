/** @jest-environment ./setup/collaborative.jest.env.ts */

import annotations from './annotations.feature'
import annotationsEdgeCases from './annotations-edge-cases.feature'
import annotationsOverlapping from './annotations-overlapping.feature'
import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotations,
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
