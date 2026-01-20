import {raise} from '@portabletext/editor/behaviors'
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
import {defineTypeaheadPicker} from './define-typeahead-picker'
import emojiPickerFeature from './emoji-picker.feature?raw'
import {useTypeaheadPicker} from './use-typeahead-picker'

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

export type EmojiMatch =
  | {
      type: 'exact'
      key: string
      emoji: string
      keyword: string
    }
  | {
      type: 'partial'
      key: string
      emoji: string
      keyword: string
      startSlice: string
      endSlice: string
    }

const emojiPicker = defineTypeaheadPicker<EmojiMatch>({
  trigger: /:/,
  keyword: /[\S]+/,
  delimiter: ':',
  getMatches: createMatchEmojis({emojis}),
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.emoji}),
    ],
  ],
})

function EmojiPickerPlugin() {
  const typeaheadPicker = useTypeaheadPicker(emojiPicker)

  return (
    <>
      <div data-testid="keyword">
        {typeaheadPicker.snapshot.context.keyword}
      </div>
      <div data-testid="matches">
        {typeaheadPicker.snapshot.context.matches
          .map((match) => match.emoji)
          .join(',')}
      </div>
    </>
  )
}

export function createMatchEmojis(config: {
  emojis: Record<string, ReadonlyArray<string>>
}): (context: {keyword: string}) => Array<EmojiMatch> {
  return ({keyword}: {keyword: string}) => {
    const foundEmojis: Array<EmojiMatch> = []

    if (keyword.length < 1) {
      return foundEmojis
    }

    for (const emoji in config.emojis) {
      const emojiKeywords = config.emojis[emoji] ?? []

      for (const emojiKeyword of emojiKeywords) {
        const keywordIndex = emojiKeyword.indexOf(keyword)

        if (keywordIndex === -1) {
          continue
        }

        if (emojiKeyword === keyword) {
          foundEmojis.push({
            type: 'exact',
            key: `${emoji}-${keyword}`,
            emoji,
            keyword,
          })
        } else {
          const start = emojiKeyword.slice(0, keywordIndex)
          const end = emojiKeyword.slice(keywordIndex + keyword.length)

          foundEmojis.push({
            type: 'partial',
            key: `${emoji}-${start}${keyword}${end}`,
            emoji,
            keyword,
            startSlice: start,
            endSlice: end,
          })
        }
      }
    }

    return foundEmojis
  }
}
