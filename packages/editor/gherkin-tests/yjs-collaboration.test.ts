import {Feature} from 'racejar/vitest'
import yjsCollaborationFeature from '../gherkin-spec/yjs-collaboration.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'
import {yjsStepDefinitions} from '../src/yjs/step-definitions'

Feature({
  featureText: yjsCollaborationFeature,
  stepDefinitions: [...yjsStepDefinitions, ...stepDefinitions],
  parameterTypes,
})
