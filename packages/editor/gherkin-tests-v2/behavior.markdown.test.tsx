import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import {MarkdownPlugin} from '../src/plugins'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
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
        ),
        schemaDefinition: defineSchema({
          annotations: [{name: 'comment'}, {name: 'link'}],
          decorators: [{name: 'em'}, {name: 'strong'}],
          blockObjects: [{name: 'image'}, {name: 'break'}],
          inlineObjects: [{name: 'stock-ticker'}],
          lists: [{name: 'bullet'}, {name: 'number'}],
          styles: [
            {name: 'normal'},
            {name: 'h1'},
            {name: 'h2'},
            {name: 'h3'},
            {name: 'h4'},
            {name: 'h5'},
            {name: 'h6'},
            {name: 'blockquote'},
          ],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: behaviorMarkdownFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes,
})
