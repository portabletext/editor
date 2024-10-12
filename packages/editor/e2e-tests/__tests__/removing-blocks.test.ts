/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import removingBlocks from '../../gherkin-spec/removing-blocks.feature'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: removingBlocks,
  stepDefinitions,
  parameterTypes,
})
