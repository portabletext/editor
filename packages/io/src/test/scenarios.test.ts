import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import concurrentEditsFeature from '../../gherkin-spec/concurrent-edits.feature?raw'
import keysFeature from '../../gherkin-spec/keys.feature?raw'
import lifecycleFeature from '../../gherkin-spec/lifecycle.feature?raw'
import listenersFeature from '../../gherkin-spec/listeners.feature?raw'
import loadingAndEmptyFeature from '../../gherkin-spec/loading-and-empty.feature?raw'
import otherEditorsFeature from '../../gherkin-spec/other-editors.feature?raw'
import outOfStepAndResyncFeature from '../../gherkin-spec/out-of-step-and-resync.feature?raw'
import sendingAndConfirmingFeature from '../../gherkin-spec/sending-and-confirming.feature?raw'
import {parameterTypes} from '../scenario/parameter-types'
import {stepDefinitions, type Context} from '../scenario/steps'
import {createWorld} from '../scenario/world'

const features = [
  concurrentEditsFeature,
  keysFeature,
  lifecycleFeature,
  listenersFeature,
  loadingAndEmptyFeature,
  otherEditorsFeature,
  outOfStepAndResyncFeature,
  sendingAndConfirmingFeature,
]

for (const featureText of features) {
  Feature({
    featureText,
    hooks: [
      Before((context: Context) => {
        context.world = createWorld()
      }),
    ],
    stepDefinitions,
    parameterTypes,
  })
}
