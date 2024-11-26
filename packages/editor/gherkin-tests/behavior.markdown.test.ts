import {Given} from 'racejar'
import {Feature} from 'racejar/vitest'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import {coreBehaviors, createMarkdownBehaviors} from '../src'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions, type Context} from './gherkin-step-definitions'

const givenMarkdownBehaviors = Given(
  'markdown behaviors',
  async (context: Context) => {
    context.testRef.send({
      type: 'update behaviors',
      behaviors: [
        ...coreBehaviors,
        ...createMarkdownBehaviors({
          defaultStyle: ({schema}) => schema.styles[0]?.value,
          headingStyle: ({schema, level}) =>
            schema.styles.find((style) => style.value === `h${level}`)?.value,
          blockquoteStyle: ({schema}) =>
            schema.styles.find((style) => style.value === 'blockquote')?.value,
          unorderedListStyle: ({schema}) =>
            schema.lists.find((list) => list.value === 'bullet')?.value,
          orderedListStyle: ({schema}) =>
            schema.lists.find((list) => list.value === 'number')?.value,
        }),
      ],
    })
  },
)

Feature({
  featureText: behaviorMarkdownFeature,
  stepDefinitions: [...stepDefinitions, givenMarkdownBehaviors],
  parameterTypes,
})
