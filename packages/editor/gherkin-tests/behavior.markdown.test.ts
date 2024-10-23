import {Feature} from '@sanity/gherkin-driver/vitest'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: behaviorMarkdownFeature,
  stepDefinitions,
  parameterTypes,
})
