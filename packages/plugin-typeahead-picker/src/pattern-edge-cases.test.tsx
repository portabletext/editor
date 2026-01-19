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
  pattern: RegExp
  autoCompleteWith?: string
  getMatches?: (ctx: {keyword: string}) => TestMatch[] | AutoCompleteTestMatch[]
}) {
  const defaultGetMatches = ({keyword}: {keyword: string}) => {
    // Always return at least one match for testing trigger behavior
    return [{key: '1', value: keyword ? `match-${keyword}` : 'empty-match'}]
  }

  if (config.autoCompleteWith) {
    return defineTypeaheadPicker<AutoCompleteTestMatch>({
      pattern: config.pattern,
      autoCompleteWith: config.autoCompleteWith,
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
      actions: [
        ({event}) => [
          raise({type: 'delete', at: event.patternSelection}),
          raise({type: 'insert.text', text: event.match.value}),
        ],
      ],
    })
  }

  return defineTypeaheadPicker<TestMatch>({
    pattern: config.pattern,
    getMatches:
      (config.getMatches as (ctx: {keyword: string}) => TestMatch[]) ??
      defaultGetMatches,
    actions: [
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
    const picker = createPicker({pattern: /^\/(\w*)/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '/cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('cmd')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('^ anchor does not trigger mid-text', async () => {
    const picker = createPicker({pattern: /^\/(\w*)/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, 'hello /cmd')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('')
    })
    expect(stateLocator.element().textContent).toEqual('idle')
  })

  test('pattern without capture group uses full match as keyword', async () => {
    const picker = createPicker({pattern: /:\w*/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual(':test')
    })
  })

  test('pattern with capture group extracts keyword', async () => {
    const picker = createPicker({pattern: /:(\w*)/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('pattern with multiple capture groups - picker never activates', async () => {
    // Patterns requiring specific characters mid-keyword (like `-`) don't
    // trigger because the pattern doesn't match until the full text is present,
    // and the picker only activates on newly typed triggers, not existing text.
    const picker = createPicker({pattern: /:(\w*)-(\w*)/})
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':foo-bar')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })

  test('different trigger characters work', async () => {
    const picker = createPicker({pattern: /@(\w*)/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '@user')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('user')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })

  test('multi-character trigger - picker never activates', async () => {
    // Multi-character triggers like ## don't work because the picker only
    // activates on newly typed triggers, not existing text. When typing the
    // second #, the first # is already there, so activation is rejected.
    const picker = createPicker({pattern: /##(\w*)/})
    const {locator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, '##test')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
  })
})

describe('autoCompleteWith edge cases', () => {
  test('auto-completes with single exact match', async () => {
    const picker = createPicker({
      pattern: /:(\w*)/,
      autoCompleteWith: ':',
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
      pattern: /:(\w*)/,
      autoCompleteWith: ':',
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
      pattern: /:(\w*)/,
      autoCompleteWith: ':',
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

  test('multi-character autoCompleteWith - picker dismisses on first delimiter char', async () => {
    // Multi-character autoCompleteWith doesn't work when the keyword character
    // class doesn't match the delimiter character.
    //
    // Example: pattern `/#(\w*)/` with autoCompleteWith `##`
    // When typing `#test#`:
    // - Pattern matches `#test` (because \w* stops at #)
    // - Cursor is at offset 6, but match ends at offset 5
    // - validateFocusSpan dismisses picker because cursor > matchEnd
    //
    // Single-char autoCompleteWith works because patterns like `/:(\S*)/`
    // include the delimiter in the match (\S matches :), so cursor stays
    // within the match boundary.
    const picker = createPicker({
      pattern: /#(\w*)/,
      autoCompleteWith: '##',
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

  test('regex special character in autoCompleteWith is escaped', async () => {
    const picker = createPicker({
      pattern: /:(\w*)/,
      autoCompleteWith: '.',
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

  test('same character for trigger and autoCompleteWith', async () => {
    // When trigger and autoCompleteWith are the same, typing :: results in
    // an empty keyword (the capture group \w* matches empty string)
    const picker = createPicker({
      pattern: /:(\w*)/,
      autoCompleteWith: ':',
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

describe('Pattern character class behavior', () => {
  test('\\w* stops at non-word characters', async () => {
    const picker = createPicker({
      pattern: /:(\w*)/,
      autoCompleteWith: ':',
    })
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test:')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('\\S* with autoCompleteWith - works via backtracking and stripping', async () => {
    // \S* includes the delimiter character, but this still works because:
    // 1. Complete pattern /:(\S*):/ matches via regex backtracking (capture = "test")
    // 2. extractKeywordFromPattern strips autoCompleteWith before matching
    // So the keyword is correctly "test", not "test:".
    const picker = createPicker({
      pattern: /:(\S*)/,
      autoCompleteWith: ':',
    })
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':test:')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('test')
    })
  })

  test('custom character class [a-z] works', async () => {
    const picker = createPicker({pattern: /:([a-z]*)/})
    const {locator, keywordLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('abc')
    })
  })

  test('custom character class stops at excluded chars and dismisses', async () => {
    // When typing characters outside the pattern's character class,
    // the picker dismisses because cursor moves past the match
    const picker = createPicker({pattern: /:([a-z]*)/})
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
    const picker = createPicker({pattern: /:([A-Z]*)/i})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':abc')

    await vi.waitFor(() => {
      expect(stateLocator.element().textContent).toEqual('idle')
    })
    expect(keywordLocator.element().textContent).toEqual('')
  })

  test('uppercase pattern requires uppercase input', async () => {
    const picker = createPicker({pattern: /:([A-Z]*)/})
    const {locator, keywordLocator, stateLocator} = await setupTest(picker)

    await userEvent.click(locator)
    await userEvent.type(locator, ':ABC')

    await vi.waitFor(() => {
      expect(keywordLocator.element().textContent).toEqual('ABC')
    })
    expect(stateLocator.element().textContent).toEqual('active')
  })
})
