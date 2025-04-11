import {Given} from 'racejar'
import {Feature} from 'racejar/vitest'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import {coreBehaviors, createMarkdownBehaviors} from '../src/behaviors'
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
          defaultStyle: ({schema}) => schema.styles[0]?.name,
          headingStyle: ({schema, level}) =>
            schema.styles.find((style) => style.name === `h${level}`)?.name,
          blockquoteStyle: ({schema}) =>
            schema.styles.find((style) => style.name === 'blockquote')?.name,
          unorderedListStyle: ({schema}) =>
            schema.lists.find((list) => list.name === 'bullet')?.name,
          orderedListStyle: ({schema}) =>
            schema.lists.find((list) => list.name === 'number')?.name,
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
