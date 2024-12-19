import {Given} from 'racejar'
import {Feature} from 'racejar/vitest'
import emojiPickerFeature from '../gherkin-spec/behavior.emoji-picker.feature?raw'
import {coreBehaviors, createEmojiPickerBehaviors} from '../src/behaviors'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions, type Context} from './gherkin-step-definitions'

const givenEmojiPickerBehaviors = Given(
  'emoji picker behaviors',
  async (context: Context) => {
    context.testRef.send({
      type: 'update behaviors',
      behaviors: [
        ...coreBehaviors,
        ...createEmojiPickerBehaviors<string>({
          matchEmojis: ({keyword}) => {
            const foundEmojis: Array<string> = []
            for (const [name, emoji] of Object.entries(emojis)) {
              if (name.includes(keyword)) {
                foundEmojis.push(emoji)
              }
            }
            return foundEmojis
          },
          parseMatch: ({match}) => match,
          onMatchesChanged: () => {},
          onSelectedIndexChanged: () => {},
        }),
      ],
    })
  },
)

Feature({
  featureText: emojiPickerFeature,
  stepDefinitions: [...stepDefinitions, givenEmojiPickerBehaviors],
  parameterTypes,
})

const emojis: Record<string, string> = {
  joy: '😂',
  joy_cat: '😹',
}
