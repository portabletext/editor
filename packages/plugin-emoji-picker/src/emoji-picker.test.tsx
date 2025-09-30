import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import emojiPickerFeature from './emoji-picker.feature?raw'
import {createMatchEmojis} from './match-emojis'
import {useEmojiPicker} from './use-emoji-picker'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <EmojiPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: emojiPickerFeature,
  stepDefinitions,
  parameterTypes,
})

const emojis: Record<string, Array<string>> = {
  '😂': ['joy'],
  '😹': ['joy_cat'],
}

const matchEmojis = createMatchEmojis({emojis})

function EmojiPickerPlugin() {
  useEmojiPicker({matchEmojis})

  return null
}
