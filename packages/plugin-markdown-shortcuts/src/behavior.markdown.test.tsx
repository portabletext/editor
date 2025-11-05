import {defineSchema} from '@portabletext/editor'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import behaviorMarkdownFeature from './behavior.markdown.feature?raw'
import {MarkdownShortcutsPlugin} from './plugin.markdown-shortcuts'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <MarkdownShortcutsPlugin
            defaultStyle={({context}) => context.schema.styles[0]?.name}
            headingStyle={({context, props}) =>
              context.schema.styles.find(
                (style) => style.name === `h${props.level}`,
              )?.name
            }
            blockquoteStyle={({context}) =>
              context.schema.styles.find((style) => style.name === 'blockquote')
                ?.name
            }
            unorderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'bullet')?.name
            }
            orderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'number')?.name
            }
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
