/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import featureFile from '../../gherkin-spec/decorators.feature'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
