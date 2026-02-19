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
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent, type Locator} from 'vitest/browser'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import typeaheadPickerFeature from './typeahead-picker.feature?raw'
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
      if (kw.toLowerCase().startsWith(keyword.toLowerCase())) {
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

const emojiPicker = defineTypeaheadPicker<EmojiMatch>({
  trigger: /:/,
  keyword: /\S*/,
  delimiter: ':',
  getMatches: matchEmojis,
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.emoji}),
    ],
  ],
})

type TypeaheadPickerTestContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
  stateLocator: Locator
  selectedIndexLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: TypeaheadPickerTestContext) => {
      const {editor, locator} = await createTestEditor({
        children: <EmojiPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          styles: [{name: 'h1', value: 'h1'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')
      context.matchesLocator = page.getByTestId('matches')
      context.stateLocator = page.getByTestId('state')
      context.selectedIndexLocator = page.getByTestId('selectedIndex')

      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
      await vi.waitFor(() =>
        expect.element(context.matchesLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: typeaheadPickerFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      async (context: TypeaheadPickerTestContext, keyword: string) => {
        await vi.waitFor(() => {
          expect(context.keywordLocator.element().textContent).toEqual(keyword)
        })
      },
    ),
    Then(
      'the matches are {string}',
      async (context: TypeaheadPickerTestContext, matches: string) => {
        await vi.waitFor(() => {
          expect(context.matchesLocator.element().textContent).toEqual(matches)
        })
      },
    ),
    Then(
      'the picker state is {string}',
      async (context: TypeaheadPickerTestContext, state: string) => {
        await vi.waitFor(() => {
          expect(context.stateLocator.element().textContent).toEqual(state)
        })
      },
    ),
    Then(
      'the selected index is {string}',
      async (context: TypeaheadPickerTestContext, index: string) => {
        await vi.waitFor(() => {
          expect(context.selectedIndexLocator.element().textContent).toEqual(
            index,
          )
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

function EmojiPickerPlugin() {
  const picker = useTypeaheadPicker(emojiPicker)

  return (
    <>
      <div data-testid="keyword">{picker.snapshot.context.keyword}</div>
      <div data-testid="matches">
        {picker.snapshot.context.matches.map((m) => m.emoji).join(',')}
      </div>
      <div data-testid="state">{getPickerState(picker)}</div>
      <div data-testid="selectedIndex">
        {picker.snapshot.context.selectedIndex}
      </div>
    </>
  )
}

type SyncMatch = {
  key: string
  name: string
}

describe('TypeaheadSelectEvent', () => {
  test('event.keyword contains the extracted keyword, not the full match', async () => {
    let receivedKeyword: string | undefined

    const testPicker = defineTypeaheadPicker<SyncMatch>({
      trigger: /:/,
      keyword: /\w*/,
      getMatches: () => [{key: '1', name: 'test'}],
      onSelect: [
        ({event}) => {
          receivedKeyword = event.keyword
          return [raise({type: 'delete', at: event.patternSelection})]
        },
      ],
    })

    function TestPickerPlugin() {
      const picker = useTypeaheadPicker(testPicker)

      return (
        <>
          <div data-testid="event-keyword-matches">
            {picker.snapshot.context.matches.map((m) => m.name).join(',')}
          </div>
          <div data-testid="event-keyword-state">{getPickerState(picker)}</div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <TestPickerPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const matchesLocator = page.getByTestId('event-keyword-matches')
    const stateLocator = page.getByTestId('event-keyword-state')

    await vi.waitFor(() => expect.element(matchesLocator).toBeInTheDocument())

    await userEvent.click(locator)

    // Type `:joy` to trigger the picker
    await userEvent.type(locator, ':joy')

    // Wait for matches to appear
    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('showing matches')
    })

    // Press Enter to select the match
    await userEvent.keyboard('{Enter}')

    // Wait for picker to return to idle
    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })

    // The keyword in the action should be the extracted keyword `joy`, not the full match `:joy`
    expect(receivedKeyword).toBe('joy')
  })
})

describe('Error handling in checking complete state', () => {
  test('error is visible when getMatches fails during complete keyword check', async () => {
    const testError = new Error('Failed to fetch matches')
    let capturedError: Error | undefined
    let capturedState: string | undefined

    const failingPicker = defineTypeaheadPicker<EmojiMatch>({
      mode: 'async',
      trigger: /:/,
      keyword: /\S*/,
      delimiter: ':',
      getMatches: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw testError
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.emoji}),
        ],
      ],
    })

    function ErrorTestPlugin() {
      const picker = useTypeaheadPicker(failingPicker)
      capturedError = picker.snapshot.context.error
      capturedState = getPickerState(picker)

      return (
        <>
          <div data-testid="complete-error-state">{capturedState}</div>
          <div data-testid="complete-error-message">
            {capturedError?.message ?? 'no error'}
          </div>
        </>
      )
    }

    const {editor, locator} = await createTestEditor({
      children: <ErrorTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const stateLocator = page.getByTestId('complete-error-state')
    const errorMessageLocator = page.getByTestId('complete-error-message')

    await vi.waitFor(() => expect.element(stateLocator).toBeInTheDocument())

    await userEvent.click(locator)

    // Type a complete keyword `:test:` to trigger `checking complete` state
    editor.send({type: 'insert.text', text: ':test:'})

    // The error should be visible (not cleared by reset)
    await vi.waitFor(() => {
      expect(errorMessageLocator.element().textContent).toEqual(
        'Failed to fetch matches',
      )
    })

    // Should be in 'no matches' state, not 'idle'
    // This is the bug: currently goes to 'idle' which clears the error
    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('no matches')
    })
  })
})

describe('Sync mode debouncing', () => {
  test('delays getMatches calls when debounceMs is configured in sync mode', async () => {
    let callCount = 0

    // Use a large debounce window so that even Firefox's slower
    // character-by-character userEvent.type stays within a single window.
    const debouncedSyncPicker = defineTypeaheadPicker<SyncMatch>({
      trigger: /:/,
      keyword: /\w*/,
      debounceMs: 1000,
      getMatches: ({keyword}) => {
        callCount++
        return [{key: '1', name: `Result for ${keyword}`}]
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.name}),
        ],
      ],
    })

    function SyncDebounceTestPlugin() {
      const picker = useTypeaheadPicker(debouncedSyncPicker)

      return (
        <>
          <div data-testid="sync-debounce-matches">
            {picker.snapshot.context.matches.map((m) => m.name).join(',')}
          </div>
          <div data-testid="sync-debounce-keyword">
            {picker.snapshot.context.keyword}
          </div>
          <div data-testid="sync-debounce-state">{getPickerState(picker)}</div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <SyncDebounceTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const matchesLocator = page.getByTestId('sync-debounce-matches')
    const keywordLocator = page.getByTestId('sync-debounce-keyword')

    await vi.waitFor(() => expect.element(matchesLocator).toBeInTheDocument())

    await userEvent.click(locator)

    // Type rapidly - each character within the debounce window
    await userEvent.type(locator, ':abc')

    // Wait for keyword to update
    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
    })

    // Wait for debounce time
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // Should have results for the final keyword
    await vi.waitFor(() => {
      expect(matchesLocator.element().textContent).toEqual('Result for abc')
    })

    // With 1000ms debouncing, rapid typing should result in fewer calls
    // than the 3 characters typed (a, ab, abc)
    expect(callCount).toBeLessThan(3)
  })
})
