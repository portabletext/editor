import {useEditor, useEditorSelector} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
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
import slashCommandPickerFeature from './slash-command-picker.feature?raw'
import {useTypeaheadPicker} from './use-typeahead-picker'

type SlashCommandMatch = {
  key: string
  label: string
  style: string
}

const commands: Array<SlashCommandMatch> = [
  {key: 'h1', label: 'Heading 1', style: 'h1'},
  {key: 'h2', label: 'Heading 2', style: 'h2'},
  {key: 'h3', label: 'Heading 3', style: 'h3'},
]

function matchCommands({keyword}: {keyword: string}): Array<SlashCommandMatch> {
  if (keyword === '') {
    return commands
  }

  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(keyword.toLowerCase()) ||
      cmd.key.toLowerCase().includes(keyword.toLowerCase()),
  )
}

const slashCommandPicker = defineTypeaheadPicker<SlashCommandMatch>({
  pattern: /^\/(\w*)/,
  getMatches: matchCommands,
  actions: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'style.toggle', style: event.match.style}),
    ],
  ],
})

type SlashCommandPickerTestContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
  stateLocator: Locator
  selectedIndexLocator: Locator
  styleLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: SlashCommandPickerTestContext) => {
      const {editor, locator} = await createTestEditor({
        children: <SlashCommandPickerPlugin />,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'h3'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')
      context.matchesLocator = page.getByTestId('matches')
      context.stateLocator = page.getByTestId('state')
      context.selectedIndexLocator = page.getByTestId('selectedIndex')
      context.styleLocator = page.getByTestId('style')

      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
      await vi.waitFor(() =>
        expect.element(context.matchesLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: slashCommandPickerFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      async (context: SlashCommandPickerTestContext, keyword: string) => {
        await vi.waitFor(() => {
          expect(context.keywordLocator.element().textContent).toEqual(keyword)
        })
      },
    ),
    Then(
      'the matches are {string}',
      async (context: SlashCommandPickerTestContext, matches: string) => {
        await vi.waitFor(() => {
          expect(context.matchesLocator.element().textContent).toEqual(matches)
        })
      },
    ),
    Then(
      'the picker state is {string}',
      async (context: SlashCommandPickerTestContext, state: string) => {
        await vi.waitFor(() => {
          expect(context.stateLocator.element().textContent).toEqual(state)
        })
      },
    ),
    Then(
      'the selected index is {string}',
      async (context: SlashCommandPickerTestContext, index: string) => {
        await vi.waitFor(() => {
          expect(context.selectedIndexLocator.element().textContent).toEqual(
            index,
          )
        })
      },
    ),
    Then(
      'the style is {string}',
      async (context: SlashCommandPickerTestContext, style: string) => {
        await vi.waitFor(() => {
          expect(context.styleLocator.element().textContent).toEqual(style)
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

function useCurrentStyle(): string {
  const editor = useEditor()
  return useEditorSelector(editor, selectors.getActiveStyle) ?? 'normal'
}

function SlashCommandPickerPlugin() {
  const picker = useTypeaheadPicker(slashCommandPicker)
  const currentStyle = useCurrentStyle()

  return (
    <>
      <div data-testid="keyword">{picker.snapshot.context.keyword}</div>
      <div data-testid="matches">
        {picker.snapshot.context.matches.map((m) => m.label).join(',')}
      </div>
      <div data-testid="state">{getPickerState(picker)}</div>
      <div data-testid="selectedIndex">
        {picker.snapshot.context.selectedIndex}
      </div>
      <div data-testid="style">{currentStyle}</div>
    </>
  )
}
