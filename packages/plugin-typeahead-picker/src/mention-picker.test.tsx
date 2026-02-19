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
import mentionPickerFeature from './mention-picker.feature?raw'
import {useTypeaheadPicker} from './use-typeahead-picker'

type MentionPickerTestContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
  stateLocator: Locator
  selectedIndexLocator: Locator
  getMatchesCallCount: number
}

let getMatchesCallCount = 0

Feature({
  hooks: [
    Before(async (context: MentionPickerTestContext) => {
      getMatchesCallCount = 0

      const {editor, locator} = await createTestEditor({
        children: <MentionPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
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
  featureText: mentionPickerFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      async (context: MentionPickerTestContext, keyword: string) => {
        await vi.waitFor(() => {
          expect(context.keywordLocator.element().textContent).toEqual(keyword)
        })
      },
    ),
    Then(
      'the matches are {string}',
      async (context: MentionPickerTestContext, matches: string) => {
        await vi.waitFor(() => {
          expect(context.matchesLocator.element().textContent).toEqual(matches)
        })
      },
    ),
    Then(
      'the picker state is {string}',
      async (context: MentionPickerTestContext, state: string) => {
        await vi.waitFor(() => {
          expect(context.stateLocator.element().textContent).toEqual(state)
        })
      },
    ),
    Then(
      'the selected index is {string}',
      async (context: MentionPickerTestContext, index: string) => {
        await vi.waitFor(() => {
          expect(context.selectedIndexLocator.element().textContent).toEqual(
            index,
          )
        })
      },
    ),
    Then(
      'getMatches was called {string} times',
      (_context: MentionPickerTestContext, count: string) => {
        expect(getMatchesCallCount).toEqual(Number(count))
      },
    ),
  ],
  parameterTypes,
})

const users: Record<string, Array<string>> = {
  'John Doe': ['john'],
  'Jane Smith': ['jane'],
  'Bob Wilson': ['bob'],
}

type MentionMatch = {
  key: string
  name: string
  username: string
}

const mentionPicker = defineTypeaheadPicker<MentionMatch>({
  mode: 'async',
  trigger: /@/,
  keyword: /\w*/,
  getMatches: createMatchUsers({users}),
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.name}),
    ],
  ],
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

function MentionPickerPlugin() {
  const typeaheadPicker = useTypeaheadPicker(mentionPicker)
  const currentState = getPickerState(typeaheadPicker)

  return (
    <>
      <div data-testid="keyword">
        {typeaheadPicker.snapshot.context.keyword}
      </div>
      <div data-testid="matches">
        {typeaheadPicker.snapshot.context.matches
          .map((match) => match.name)
          .join(',')}
      </div>
      <div data-testid="state">{currentState}</div>
      <div data-testid="selectedIndex">
        {typeaheadPicker.snapshot.context.selectedIndex}
      </div>
    </>
  )
}

function createMatchUsers(config: {
  users: Record<string, ReadonlyArray<string>>
}): (context: {keyword: string}) => Promise<Array<MentionMatch>> {
  return async ({keyword}: {keyword: string}): Promise<Array<MentionMatch>> => {
    getMatchesCallCount++
    await new Promise((resolve) => setTimeout(resolve, 50))

    const foundUsers: Array<MentionMatch> = []

    if (keyword.length < 1) {
      return foundUsers
    }

    for (const name in config.users) {
      const usernames = config.users[name] ?? []

      for (const username of usernames) {
        const keywordIndex = username.indexOf(keyword.toLowerCase())

        if (keywordIndex === -1) {
          continue
        }

        foundUsers.push({
          key: `${name}-${username}`,
          name,
          username,
        })
      }
    }

    return foundUsers
  }
}

describe('Error handling', () => {
  test('captures error when getMatches rejects', async () => {
    const testError = new Error('API unavailable')
    let capturedError: Error | undefined

    const failingPicker = defineTypeaheadPicker<MentionMatch>({
      mode: 'async',
      trigger: /@/,
      keyword: /\w*/,
      getMatches: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw testError
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.name}),
        ],
      ],
    })

    function ErrorTestPlugin() {
      const picker = useTypeaheadPicker(failingPicker)
      capturedError = picker.snapshot.context.error

      return (
        <>
          <div data-testid="error-state">
            {picker.snapshot.matches({active: 'no matches'})
              ? 'no matches'
              : 'other'}
          </div>
          <div data-testid="error-message">{capturedError?.message ?? ''}</div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <ErrorTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const errorStateLocator = page.getByTestId('error-state')
    const errorMessageLocator = page.getByTestId('error-message')

    await vi.waitFor(() =>
      expect.element(errorStateLocator).toBeInTheDocument(),
    )

    await userEvent.click(locator)
    await userEvent.type(locator, '@test')

    await vi.waitFor(() => {
      expect(errorStateLocator.element().textContent).toEqual('no matches')
    })

    await vi.waitFor(() => {
      expect(errorMessageLocator.element().textContent).toEqual(
        'API unavailable',
      )
    })
  })

  test('clears error when returning to idle', async () => {
    const testError = new Error('API unavailable')
    let capturedError: Error | undefined

    const failingPicker = defineTypeaheadPicker<MentionMatch>({
      mode: 'async',
      trigger: /@/,
      keyword: /\w*/,
      getMatches: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw testError
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.name}),
        ],
      ],
    })

    function ErrorClearTestPlugin() {
      const picker = useTypeaheadPicker(failingPicker)
      capturedError = picker.snapshot.context.error

      return (
        <>
          <div data-testid="error-clear-state">
            {picker.snapshot.matches('idle') ? 'idle' : 'active'}
          </div>
          <div data-testid="error-clear-message">
            {capturedError?.message ?? 'no error'}
          </div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <ErrorClearTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const stateLocator = page.getByTestId('error-clear-state')
    const errorMessageLocator = page.getByTestId('error-clear-message')

    await vi.waitFor(() => expect.element(stateLocator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.type(locator, '@test')

    await vi.waitFor(() => {
      expect(errorMessageLocator.element().textContent).toEqual(
        'API unavailable',
      )
    })

    await userEvent.keyboard('{Escape}')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })

    await vi.waitFor(() => {
      expect(errorMessageLocator.element().textContent).toEqual('no error')
    })
  })
})

describe('Race condition handling', () => {
  test('ignores stale results from slow requests', async () => {
    const requestOrder: Array<string> = []
    const responseOrder: Array<string> = []

    const racePicker = defineTypeaheadPicker<MentionMatch>({
      mode: 'async',
      trigger: /@/,
      keyword: /\w*/,
      getMatches: async ({keyword}) => {
        requestOrder.push(keyword)

        if (keyword === 'a') {
          await new Promise((resolve) => setTimeout(resolve, 100))
          responseOrder.push(keyword)
          return [{key: 'a1', name: 'Slow Result A', username: 'a'}]
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
        responseOrder.push(keyword)
        return [{key: 'ab1', name: 'Fast Result AB', username: 'ab'}]
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.name}),
        ],
      ],
    })

    function RaceTestPlugin() {
      const picker = useTypeaheadPicker(racePicker)

      return (
        <>
          <div data-testid="race-matches">
            {picker.snapshot.context.matches.map((m) => m.name).join(',')}
          </div>
          <div data-testid="race-keyword">
            {picker.snapshot.context.keyword}
          </div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <RaceTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const matchesLocator = page.getByTestId('race-matches')
    const keywordLocator = page.getByTestId('race-keyword')

    await vi.waitFor(() => expect.element(matchesLocator).toBeInTheDocument())

    await userEvent.click(locator)
    await userEvent.type(locator, '@a')

    await new Promise((resolve) => setTimeout(resolve, 20))

    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('ab')
    })

    await vi.waitFor(
      () => {
        expect(matchesLocator.element().textContent).toEqual('Fast Result AB')
      },
      {timeout: 200},
    )

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(matchesLocator.element().textContent).toEqual('Fast Result AB')

    expect(requestOrder).toContain('a')
    expect(requestOrder).toContain('ab')
    expect(responseOrder).toContain('a')
    expect(responseOrder).toContain('ab')
  })
})

describe('Debouncing', () => {
  test('delays getMatches calls when debounce is configured', async () => {
    let callCount = 0
    const callTimestamps: number[] = []
    const startTime = Date.now()

    // Use a large debounce window so that even Firefox's slower
    // character-by-character userEvent.type stays within a single window.
    const debouncedPicker = defineTypeaheadPicker<MentionMatch>({
      mode: 'async',
      trigger: /@/,
      keyword: /\w*/,
      debounceMs: 1000,
      getMatches: async ({keyword}) => {
        callCount++
        callTimestamps.push(Date.now() - startTime)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return [{key: '1', name: `Result for ${keyword}`, username: keyword}]
      },
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.name}),
        ],
      ],
    })

    function DebounceTestPlugin() {
      const picker = useTypeaheadPicker(debouncedPicker)

      return (
        <>
          <div data-testid="debounce-matches">
            {picker.snapshot.context.matches.map((m) => m.name).join(',')}
          </div>
          <div data-testid="debounce-keyword">
            {picker.snapshot.context.keyword}
          </div>
        </>
      )
    }

    const {locator} = await createTestEditor({
      children: <DebounceTestPlugin />,
      schemaDefinition: defineSchema({}),
    })

    const matchesLocator = page.getByTestId('debounce-matches')
    const keywordLocator = page.getByTestId('debounce-keyword')

    await vi.waitFor(() => expect.element(matchesLocator).toBeInTheDocument())

    await userEvent.click(locator)

    // Type rapidly - each character within the debounce window
    await userEvent.type(locator, '@abc')

    // Wait for keyword to update
    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
    })

    // Wait for debounce + fetch time
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
