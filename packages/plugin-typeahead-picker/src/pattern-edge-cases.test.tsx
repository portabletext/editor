import {raise} from '@portabletext/editor/behaviors'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import {useTypeaheadPicker} from './use-typeahead-picker'

type TestMatch = {
  key: string
  value: string
}

type AutoCompleteTestMatch = TestMatch & {
  type: 'exact' | 'partial'
}

function createPicker(config: {
  trigger: RegExp
  keyword: RegExp
  delimiter?: string
  getMatches?: (ctx: {keyword: string}) => TestMatch[] | AutoCompleteTestMatch[]
}) {
  const defaultGetMatches = ({keyword}: {keyword: string}) => {
    // Always return at least one match for testing trigger behavior
    return [{key: '1', value: keyword ? `match-${keyword}` : 'empty-match'}]
  }

  if (config.delimiter) {
    return defineTypeaheadPicker<AutoCompleteTestMatch>({
      trigger: config.trigger,
      keyword: config.keyword,
      delimiter: config.delimiter,
      getMatches:
        (config.getMatches as (ctx: {
          keyword: string
        }) => AutoCompleteTestMatch[]) ??
        (({keyword}) => {
          // Always return at least one match for testing trigger behavior
          return [
            {
              key: '1',
              value: keyword ? `match-${keyword}` : 'empty-match',
              type: 'partial',
            },
          ]
        }),
      onSelect: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.value}),
        ],
      ],
    })
  }

  return defineTypeaheadPicker<TestMatch>({
    trigger: config.trigger,
    keyword: config.keyword,
    getMatches:
      (config.getMatches as (ctx: {keyword: string}) => TestMatch[]) ??
      defaultGetMatches,
    onSelect: [
      ({event}) => [
        raise({type: 'delete', at: event.patternSelection}),
        raise({type: 'insert.text', text: event.match.value}),
      ],
    ],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PickerPlugin(props: {picker: any}) {
  const picker = useTypeaheadPicker(props.picker)

  return (
    <>
      <div data-testid="keyword">{picker.snapshot.context.keyword}</div>
      <div data-testid="matches">
        {(picker.snapshot.context.matches as TestMatch[])
          .map((m) => m.value)
          .join(',')}
      </div>
      <div data-testid="state">
        {picker.snapshot.matches('idle') ? 'idle' : 'active'}
      </div>
    </>
  )
}

async function setupTest(picker: ReturnType<typeof createPicker>) {
  const {editor, locator} = await createTestEditor({
    children: <PickerPlugin picker={picker} />,
    schemaDefinition: defineSchema({}),
  })

  const keywordLocator = page.getByTestId('keyword')
  const matchesLocator = page.getByTestId('matches')
  const stateLocator = page.getByTestId('state')

  await expect.element(keywordLocator).toBeInTheDocument()

  return {editor, locator, keywordLocator, matchesLocator, stateLocator}
}

describe('Pattern variations', () => {
  test('Scenario: a `^` anchored trigger activates at the start of a block', async () => {
    const picker = createPicker({trigger: /^\//, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '/cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('cmd')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('Scenario: a `^` anchored trigger does not activate mid-text', async () => {
    const picker = createPicker({trigger: /^\//, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, 'hello /cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('')
    })
    expect(stateLocator.element().textContent).toEqual('idle')
  })

  test('Scenario: a trigger followed by a keyword extracts the keyword', async () => {
    const picker = createPicker({trigger: /:/, keyword: /\w*/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('Scenario: a trigger character other than `:` activates the picker', async () => {
    const picker = createPicker({trigger: /@/, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '@user')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('user')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('Scenario: typing the second character of a multi-character trigger opens the picker', async () => {
    const picker = createPicker({trigger: /\[\[/, keyword: /[^\]]*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    // `[` starts a key descriptor in the user-event keyboard syntax, `[[` types a literal `[`
    await userEvent.type(locator, '[[[[')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('')
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[foo')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('foo')
    })
  })

  test('Scenario: typing a multi-character trigger opens the picker when the keyword pattern requires a character', async () => {
    const picker = createPicker({trigger: /\[\[/, keyword: /\w+/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    // `[` starts a key descriptor in the user-event keyboard syntax, `[[` types a literal `[`
    await userEvent.type(locator, '[[[[')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('')
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[foo')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('foo')
    })
  })

  test('Scenario: one insert that completes a multi-character trigger and adds a keyword opens the picker', async () => {
    const picker = createPicker({trigger: /\[\[/, keyword: /[^\]]*/})
    const {editor, locator, keywordLocator, stateLocator} =
      await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '[[')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[')
    })

    editor.send({type: 'insert.text', text: '[foo'})

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[foo')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('foo')
    })
  })

  test('Scenario: typing the third character of a three-character trigger opens the picker', async () => {
    const picker = createPicker({trigger: /:::/, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '::')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('::')
      expect(stateLocator.element().textContent).toEqual('idle')
    })

    await userEvent.type(locator, ':foo')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual(':::foo')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('foo')
    })
  })

  test('Scenario: selecting a match after a multi-character trigger removes the whole trigger', async () => {
    const picker = createPicker({
      trigger: /\[\[/,
      keyword: /[^\]]*/,
      getMatches: () => [{key: '1', value: 'bar'}],
    })
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '[[[[foo')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[[foo')
      expect(stateLocator.element().textContent).toEqual('active')
      expect(keywordLocator.element().textContent).toEqual('foo')
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('bar')
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })
})

describe('delimiter edge cases', () => {
  test('Scenario: a delimiter after a single exact match auto-completes it', async () => {
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: ':',
      getMatches: ({keyword}) => {
        if (keyword === 'joy') {
          return [{key: '1', value: '😂', type: 'exact'}]
        }
        return []
      },
    })
    const {locator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':joy:')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toContain('😂')
    })
  })

  test('Scenario: a delimiter after multiple exact matches auto-completes the first', async () => {
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: ':',
      getMatches: ({keyword}) => {
        if (keyword === 'test') {
          return [
            {key: '1', value: 'test1', type: 'exact'},
            {key: '2', value: 'test2', type: 'exact'},
          ]
        }
        return []
      },
    })
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test:')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
      expect(locator.element().textContent).toContain('test1')
    })
  })

  test('Scenario: typing a multi-character trigger, keyword and delimiter auto-completes a single exact match', async () => {
    const picker = createPicker({
      trigger: /\[\[/,
      keyword: /[^\]]*/,
      delimiter: ']',
      getMatches: ({keyword}) => {
        if (keyword === 'foo') {
          return [{key: '1', value: 'bar', type: 'exact'}]
        }
        return []
      },
    })
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    // `[` starts a key descriptor in the user-event keyboard syntax, `[[` types a literal `[`
    await userEvent.type(locator, '[[[[foo]')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('bar')
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })

  test('Scenario: one insert that completes a multi-character trigger, keyword and delimiter auto-completes', async () => {
    const picker = createPicker({
      trigger: /\[\[/,
      keyword: /[^\]]*/,
      delimiter: ']',
      getMatches: ({keyword}) => {
        if (keyword === 'foo') {
          return [{key: '1', value: 'bar', type: 'exact'}]
        }
        return []
      },
    })
    const {editor, locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '[[')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('[')
    })

    editor.send({type: 'insert.text', text: '[foo]'})

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('bar')
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })

  test('Scenario: a delimiter after only partial matches does not auto-complete', async () => {
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: ':',
      getMatches: ({keyword}) => {
        if (keyword === 'jo') {
          return [{key: '1', value: 'joy', type: 'partial'}]
        }
        return []
      },
    })
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':jo:')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('active')
    })
  })

  test('Scenario: a delimiter outside the keyword character class still completes or keeps the picker active', async () => {
    // The delimiter does not need to be in the keyword pattern's character class.
    // When the delimiter is typed:
    // - If there's an exact match → auto-complete
    // - If no exact match → picker stays active (in 'no matches' or 'showing matches' state)
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/, // \w does NOT include ':'
      delimiter: ':',
      getMatches: ({keyword}) => {
        if (keyword === 'joy') {
          return [{key: '1', value: '😂', type: 'exact'}]
        }
        return [] // No matches for other keywords
      },
    })
    const {locator, stateLocator} = await setupTest(picker)

    // Case 1: exact match - should auto-complete
    await userEvent.click(locator)
    await userEvent.type(locator, ':joy:')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toContain('😂')
      expect(stateLocator.element().textContent).toEqual('idle')
    })

    // Case 2: no matches - should stay active (in 'no matches' state)
    await userEvent.type(locator, ':xyz:')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('active')
    })

    // Case 3: typing another : after no match - what happens?
    await userEvent.type(locator, ':')

    await vi.waitFor(() => {
      // Cursor moves outside partial pattern bounds, picker dismisses
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })

  test('Scenario: the first character of a multi-character delimiter dismisses the picker', async () => {
    // Multi-character delimiter doesn't work when the keyword character
    // class doesn't match the delimiter character.
    //
    // Example: trigger `/#/`, keyword `/\w*/` with delimiter `##`
    // When typing `#test#`:
    // - Pattern matches `#test` (because \w* stops at #)
    // - Cursor is at offset 6, but match ends at offset 5
    // - validateFocusSpan dismisses picker because cursor > matchEnd
    //
    // Single-char delimiter works because patterns like trigger `/:/`, keyword `/\S*/`
    // include the delimiter in the match (\S matches :), so cursor stays
    // within the match boundary.
    const picker = createPicker({
      trigger: /#/,
      keyword: /\w*/,
      delimiter: '##',
      getMatches: ({keyword}) => {
        if (keyword === 'test') {
          return [{key: '1', value: 'result', type: 'exact'}]
        }
        return []
      },
    })
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '#test')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('active')
    })

    // Typing first # of ## dismisses the picker
    await userEvent.type(locator, '#')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })

  test('Scenario: a regex special character in the delimiter is matched literally', async () => {
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: '.',
      getMatches: ({keyword}) => {
        if (keyword === 'test') {
          return [{key: '1', value: 'result', type: 'exact'}]
        }
        return []
      },
    })
    const {locator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test.')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toContain('result')
    })
  })

  test('Scenario: the same character as trigger and delimiter yields an empty keyword', async () => {
    // When trigger and delimiter are the same, typing :: results in
    // an empty keyword (the keyword pattern \w* matches empty string)
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: ':',
      getMatches: () => [{key: '1', value: 'result', type: 'partial'}],
    })
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '::')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('active')
    })
    // Keyword is empty because \w* between the two colons matches nothing
    expect(keywordLocator.element().textContent).toEqual('')
  })
})

describe('Keyword pattern character class behavior', () => {
  test('Scenario: a `\\w*` keyword stops at non-word characters', async () => {
    const picker = createPicker({
      trigger: /:/,
      keyword: /\w*/,
      delimiter: ':',
    })
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test:')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('Scenario: a `\\S*` keyword with a delimiter strips the delimiter from the keyword', async () => {
    // \S* includes the delimiter character, but this still works because:
    // extractKeyword strips the delimiter from the end of the pattern text
    // So the keyword is correctly "test", not "test:".
    const picker = createPicker({
      trigger: /:/,
      keyword: /\S*/,
      delimiter: ':',
    })
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test:')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('Scenario: a custom `[a-z]` character class extracts the keyword', async () => {
    const picker = createPicker({trigger: /:/, keyword: /[a-z]*/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
    })
  })

  test('Scenario: a character outside a custom character class dismisses the picker', async () => {
    // When typing characters outside the keyword's character class,
    // the picker dismisses because cursor moves past the match
    const picker = createPicker({trigger: /:/, keyword: /[a-z]*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
      expect(stateLocator.element().textContent).toEqual('active')
    })

    // Typing a digit dismisses the picker
    await userEvent.type(locator, '1')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })
})

describe('Pattern flags', () => {
  test('Scenario: a case-insensitive flag has no effect on the trigger', async () => {
    const picker = createPicker({trigger: /:/i, keyword: /[A-Z]*/i})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
    expect(keywordLocator.element().textContent).toEqual('')
  })

  test('Scenario: an uppercase keyword pattern requires uppercase input', async () => {
    const picker = createPicker({trigger: /:/, keyword: /[A-Z]*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':ABC')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('ABC')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })
})
