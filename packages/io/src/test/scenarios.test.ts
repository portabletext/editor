import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {describe} from 'vitest'
import concurrentEditsFeature from '../../gherkin-spec/concurrent-edits.feature?raw'
import keysFeature from '../../gherkin-spec/keys.feature?raw'
import lifecycleFeature from '../../gherkin-spec/lifecycle.feature?raw'
import listenersFeature from '../../gherkin-spec/listeners.feature?raw'
import loadingAndEmptyFeature from '../../gherkin-spec/loading-and-empty.feature?raw'
import malformedContentFeature from '../../gherkin-spec/malformed-content.feature?raw'
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
  malformedContentFeature,
  otherEditorsFeature,
  outOfStepAndResyncFeature,
  sendingAndConfirmingFeature,
]

const modes = [
  {name: 'transactions with patches only', serverCopyOnTransactions: false},
  {name: "transactions with the server's copy", serverCopyOnTransactions: true},
]

for (const {name, serverCopyOnTransactions} of modes) {
  describe(name, () => {
    for (const featureText of features) {
      Feature({
        featureText,
        hooks: [
          Before((context: Context) => {
            context.world = createWorld({serverCopyOnTransactions})
          }),
        ],
        stepDefinitions,
        parameterTypes,
      })
    }
  })
}
