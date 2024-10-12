/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import annotationsAcrossBlocks from '../../gherkin-spec/annotations-across-blocks.feature'
import annotationsEdgeCases from '../../gherkin-spec/annotations-edge-cases.feature'
import annotationsOverlappingDecorators from '../../gherkin-spec/annotations-overlapping-decorators.feature'
import annotationsOverlapping from '../../gherkin-spec/annotations-overlapping.feature'
import annotations from '../../gherkin-spec/annotations.feature'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

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
