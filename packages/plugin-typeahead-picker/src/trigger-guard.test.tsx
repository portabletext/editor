import {raise} from '@portabletext/editor/behaviors'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before, Given, Then} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import triggerGuardFeature from './trigger-guard.feature?raw'
import type {AutoCompleteMatch} from './typeahead-picker.types'
import {useTypeaheadPicker} from './use-typeahead-picker'

type EmojiMatch = AutoCompleteMatch & {
  key: string
  emoji: string
  keyword: string
}

const emojis: Record<string, Array<string>> = {
  '😂': ['joy'],
  '😹': ['joy_cat'],
  '🕹️': ['joystick'],
}

function matchEmojis({keyword}: {keyword: string}): Array<EmojiMatch> {
  const matches: Array<EmojiMatch> = []

  for (const [emoji, keywords] of Object.entries(emojis)) {
    for (const kw of keywords) {
      if (
        keyword === '' ||
        kw.toLowerCase().startsWith(keyword.toLowerCase())
      ) {
        matches.push({
          key: kw,
          emoji,
          keyword: kw,
          type:
            kw.toLowerCase() === keyword.toLowerCase() ? 'exact' : 'partial',
        })
      }
    }
  }

  return matches
}

let guardShouldAllow = true

const guardedEmojiPicker = defineTypeaheadPicker<EmojiMatch>({
  trigger: /:/,
  keyword: /\S*/,
  delimiter: ':',
  guard: ({snapshot: _snapshot, event: _event, dom: _dom}) => guardShouldAllow,
  getMatches: matchEmojis,
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.emoji}),
    ],
  ],
})

type TriggerGuardTestContext = Context & {
  keywordLocator: Locator
  stateLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: TriggerGuardTestContext) => {
      guardShouldAllow = true

      const {editor, locator} = await createTestEditor({
        children: <GuardedEmojiPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')
      context.stateLocator = page.getByTestId('state')

      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
      await vi.waitFor(() =>
        expect.element(context.stateLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: triggerGuardFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Given(
      'the guard returns {word}',
      (_context: TriggerGuardTestContext, guardResponse: string) => {
        guardShouldAllow = guardResponse === 'true'
      },
    ),
    Then(
      'the keyword is {string}',
      async (context: TriggerGuardTestContext, keyword: string) => {
        await vi.waitFor(() => {
          expect(context.keywordLocator.element().textContent).toEqual(keyword)
        })
      },
    ),
    Then(
      'the picker state is {string}',
      async (context: TriggerGuardTestContext, state: string) => {
        await vi.waitFor(() => {
          expect(context.stateLocator.element().textContent).toEqual(state)
        })
      },
    ),
  ],
  parameterTypes,
})

function getPickerState<TMatch extends object>(
  picker: ReturnType<typeof useTypeaheadPicker<TMatch>>,
): string {
  if (picker.snapshot.matches('idle')) {
    return 'idle'
  }
  if (picker.snapshot.matches({active: 'loading'})) {
    return 'loading'
  }
  if (picker.snapshot.matches({active: 'no matches'})) {
    return 'no matches'
  }
  if (picker.snapshot.matches({active: 'showing matches'})) {
    return 'showing matches'
  }
  return 'unknown'
}

function GuardedEmojiPickerPlugin() {
  const picker = useTypeaheadPicker(guardedEmojiPicker)

  return (
    <>
      <div data-testid="keyword">{picker.snapshot.context.keyword}</div>
      <div data-testid="state">{getPickerState(picker)}</div>
    </>
  )
}
