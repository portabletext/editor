import {page} from '@vitest/browser/context'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import {MarkdownPlugin} from '../src/plugins'
import {parameterTypes} from './gherkin-parameter-types'
import {RenderEditor} from './render-editor'
import type {Context} from './step-context'
import {stepDefinitions} from './step-definitions'

Feature({
  hooks: [
    Before(async (context: Context) => {
      render(
        <RenderEditor page={page} context={context}>
          <MarkdownPlugin
            config={{
              defaultStyle: ({schema}) => schema.styles[0]?.name,
              headingStyle: ({schema, level}) =>
                schema.styles.find((style) => style.name === `h${level}`)?.name,
              blockquoteStyle: ({schema}) =>
                schema.styles.find((style) => style.name === 'blockquote')
                  ?.name,
              unorderedListStyle: ({schema}) =>
                schema.lists.find((list) => list.name === 'bullet')?.name,
              orderedListStyle: ({schema}) =>
                schema.lists.find((list) => list.name === 'number')?.name,
            }}
          />
        </RenderEditor>,
      )

      await vi.waitFor(() =>
        expect.element(context.editor.locator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: behaviorMarkdownFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes,
})
