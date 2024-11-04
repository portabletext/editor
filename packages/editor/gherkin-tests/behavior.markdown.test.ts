import {Given} from '@sanity/gherkin-driver'
import {Feature} from '@sanity/gherkin-driver/vitest'
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
          mapDefaultStyle: (schema) => schema.styles[0]?.value,
          mapHeadingStyle: (schema, level) => schema.styles[level]?.value,
          mapBlockquoteStyle: (schema) =>
            schema.styles.find((style) => style.value === 'blockquote')?.value,
          mapUnorderedListStyle: (schema) =>
            schema.lists.find((list) => list.value === 'bullet')?.value,
          mapOrderedListStyle: (schema) =>
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
