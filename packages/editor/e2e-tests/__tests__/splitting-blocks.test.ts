/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import featureFile from '../../gherkin-spec/splitting-blocks.feature'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
