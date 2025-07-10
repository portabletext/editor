import {page} from '@vitest/browser/context'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {parameterTypes} from '../../gherkin-tests-v2/gherkin-parameter-types'
import {RenderEditor} from '../../gherkin-tests-v2/render-editor'
import type {Context} from '../../gherkin-tests-v2/step-context'
import {stepDefinitions} from '../../gherkin-tests-v2/step-definitions'
import {SmartQuotesPlugin} from './plugin.smart-quotes'
import smartQuotesFeature from './plugin.smart-quotes.feature?raw'

Feature({
  hooks: [
    Before(async (context: Context) => {
      render(
        <RenderEditor page={page} context={context}>
          <SmartQuotesPlugin />
        </RenderEditor>,
      )

      await vi.waitFor(() =>
        expect.element(context.editor.locator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: smartQuotesFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes,
})
