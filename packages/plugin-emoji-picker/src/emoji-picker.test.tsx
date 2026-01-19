import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before, Then} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import {createMatchEmojis} from './create-match-emojis'
import emojiPickerFeature from './emoji-picker.feature?raw'
import {useEmojiPicker} from './use-emoji-picker'

type EmojiPickerTestContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: EmojiPickerTestContext) => {
      const {editor, locator} = await createTestEditor({
        children: <EmojiPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')
      context.matchesLocator = page.getByTestId('matches')

      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
      await vi.waitFor(() =>
        expect.element(context.matchesLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: emojiPickerFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      (context: EmojiPickerTestContext, keyword: string) => {
        expect(context.keywordLocator.element().textContent).toEqual(keyword)
      },
    ),
    Then(
      'the matches are {string}',
      (context: EmojiPickerTestContext, matches: string) => {
        expect(context.matchesLocator.element().textContent).toEqual(matches)
      },
    ),
  ],
  parameterTypes,
})

const emojis: Record<string, Array<string>> = {
  '😂': ['joy'],
  '😹': ['joy_cat'],
  '🕹️': ['joy!stick'],
  '😘': ['*'],
  '❗️': ['!'],
  '⁉️': ['!?'],
  '‼️': ['!!'],
  '😊': [':)'],
  '🐕': ['dog'],
  '🐩': ['dog'],
}

const matchEmojis = createMatchEmojis({emojis})

function EmojiPickerPlugin() {
  const {keyword, matches} = useEmojiPicker({matchEmojis})

  return (
    <>
      <div data-testid="keyword">{keyword}</div>
      <div data-testid="matches">
        {matches.map((match) => match.emoji).join(',')}
      </div>
    </>
  )
}
