/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import removingBlocks from '../../gherkin-spec/removing-blocks.feature'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: removingBlocks,
  stepDefinitions,
  parameterTypes,
})
