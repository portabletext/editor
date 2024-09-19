/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import removingBlocks from './removing-blocks.feature'

Feature({
  featureText: removingBlocks,
  stepDefinitions,
  parameterTypes,
})
