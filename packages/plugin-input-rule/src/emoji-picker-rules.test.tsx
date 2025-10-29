import {useEditor} from '@portabletext/editor'
import {defineBehavior, effect, raise} from '@portabletext/editor/behaviors'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before, Then} from 'racejar'
import {Feature} from 'racejar/vitest'
import {useEffect, useState} from 'react'
import {expect, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import emojiPickerRulesFeature from './emoji-picker-rules.feature?raw'
import {defineInputRule} from './input-rule'
import {defineInputRuleBehavior} from './plugin.input-rule'

const triggerRule = defineInputRule({
  on: /:/,
  actions: [
    () => [
      raise({
        type: 'custom.keyword found',
        keyword: '',
      }),
    ],
  ],
})
const partialKeywordRule = defineInputRule({
  on: /:[a-zA-Z-_0-9]+/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)

    if (!lastMatch) {
      return false
    }

    return {keyword: lastMatch.text.slice(1)}
  },
  actions: [(_, {keyword}) => [raise({type: 'custom.keyword found', keyword})]],
})
const keywordRule = defineInputRule({
  on: /:[a-zA-Z-_0-9]+:/,
  guard: ({event}) => {
    const lastMatch = event.matches.at(-1)

    if (!lastMatch) {
      return false
    }

    return {keyword: lastMatch.text.slice(1, -1)}
  },
  actions: [(_, {keyword}) => [raise({type: 'custom.keyword found', keyword})]],
})

function EmojiPickerRulesPlugin() {
  const editor = useEditor()
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const unregisterBehaviors = [
      editor.registerBehavior({
        behavior: defineInputRuleBehavior({
          rules: [keywordRule, partialKeywordRule, triggerRule],
        }),
      }),
      editor.registerBehavior({
        behavior: defineBehavior<{keyword: string}>({
          on: 'custom.keyword found',
          actions: [
            ({event}) => [
              effect(() => {
                setKeyword(event.keyword)
              }),
            ],
          ],
        }),
      }),
    ]

    return () => {
      for (const unregister of unregisterBehaviors) {
        unregister()
      }
    }
  }, [])

  return <div data-testid="keyword">{keyword}</div>
}

Feature({
  hooks: [
    Before(async (context: Context & {keywordLocator: Locator}) => {
      const {editor, locator} = await createTestEditor({
        children: <EmojiPickerRulesPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
          inlineObjects: [{name: 'stock-ticker'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')

      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: emojiPickerRulesFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      (context: Context & {keywordLocator: Locator}, keyword: string) => {
        expect(context.keywordLocator.element().textContent).toEqual(keyword)
      },
    ),
  ],
  parameterTypes,
})
