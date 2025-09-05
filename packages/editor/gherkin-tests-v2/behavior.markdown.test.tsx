import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import behaviorMarkdownFeature from '../gherkin-spec/behavior.markdown.feature?raw'
import type {Editor} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {MarkdownPlugin} from '../src/plugins'
import {parameterTypes} from './gherkin-parameter-types'
import type {Context} from './step-context'
import {stepDefinitions} from './step-definitions'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editorRef, locator, sendNativeEvent} = await createTestEditor({
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

      context.editor = {
        ref: editorRef as React.RefObject<Editor>,
        locator,
        sendNativeEvent,
        value: () => editorRef.current?.getSnapshot().context.value ?? [],
        selection: () =>
          editorRef.current?.getSnapshot().context.selection ?? null,
        snapshot: () => editorRef.current!.getSnapshot(),
      }
    }),
  ],
  featureText: behaviorMarkdownFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes,
})
