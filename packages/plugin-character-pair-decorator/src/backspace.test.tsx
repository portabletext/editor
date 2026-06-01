import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import backspaceFeature from './backspace.feature?raw'
import {CharacterPairDecoratorPlugin} from './plugin.character-pair-decorator'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <CharacterPairDecoratorPlugin
            decorator={() => 'code'}
            pair={{char: '`', amount: 1}}
          />
        ),
        schemaDefinition: defineSchema({
          decorators: [{name: 'code'}, {name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: backspaceFeature,
  stepDefinitions,
  parameterTypes,
})
