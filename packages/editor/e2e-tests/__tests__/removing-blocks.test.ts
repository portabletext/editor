/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import removingBlocks from './removing-blocks.feature'

Feature({
  featureText: removingBlocks,
  stepDefinitions,
  parameterTypes,
})
