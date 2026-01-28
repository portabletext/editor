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

  await vi.waitFor(() => expect.element(keywordLocator).toBeInTheDocument())

  return {editor, locator, keywordLocator, matchesLocator, stateLocator}
}

describe('Pattern variations', () => {
  test('^ anchor triggers only at start of block', async () => {
    const picker = createPicker({trigger: /^\//, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '/cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('cmd')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('^ anchor does not trigger mid-text', async () => {
    const picker = createPicker({trigger: /^\//, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, 'hello /cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('')
    })
    expect(stateLocator.element().textContent).toEqual('idle')
  })

  test('trigger + keyword extracts keyword correctly', async () => {
    const picker = createPicker({trigger: /:/, keyword: /\w*/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('different trigger characters work', async () => {
    const picker = createPicker({trigger: /@/, keyword: /\w*/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '@user')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('user')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('multi-character triggers are not supported', async () => {
    // Multi-character triggers don't work reliably because:
    // 1. Typing character-by-character: the trigger rule requires textInserted === lastMatch.text
    // 2. Android composition: partial rule rejects when match starts before insertion point
    // Use single-character triggers for reliable behavior.
    const picker = createPicker({trigger: /##/, keyword: /\w*/})
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '##test')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })
})

describe('delimiter edge cases', () => {
  test('auto-completes with single exact match', async () => {
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

  test('auto-completes with first exact match when multiple exact matches exist', async () => {
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

  test('does not auto-complete with only partial matches', async () => {
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

  test('delimiter works even when not in keyword character class', async () => {
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

  test('multi-character delimiter - picker dismisses on first delimiter char', async () => {
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

  test('regex special character in delimiter is escaped', async () => {
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

  test('same character for trigger and delimiter', async () => {
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
  test('\\w* stops at non-word characters', async () => {
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

  test('\\S* with delimiter - strips delimiter from keyword', async () => {
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

  test('custom character class [a-z] works', async () => {
    const picker = createPicker({trigger: /:/, keyword: /[a-z]*/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
    })
  })

  test('custom character class stops at excluded chars and dismisses', async () => {
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

describe('Flags are normalized (ignored)', () => {
  test('case-insensitive flag has no effect on trigger', async () => {
    const picker = createPicker({trigger: /:/i, keyword: /[A-Z]*/i})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
    expect(keywordLocator.element().textContent).toEqual('')
  })

  test('uppercase keyword pattern requires uppercase input', async () => {
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
