import {raise} from '@portabletext/editor/behaviors'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before, Then, When} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import onDismissFeature from './on-dismiss.feature?raw'
import {useTypeaheadPicker} from './use-typeahead-picker'

type MentionMatch = {
  key: string
  name: string
  username: string
}

const users: Record<string, Array<string>> = {
  'John Doe': ['john'],
  'Jane Smith': ['jane'],
  'Bob Wilson': ['bob'],
}

function matchUsers({keyword}: {keyword: string}): Array<MentionMatch> {
  const matches: Array<MentionMatch> = []

  if (keyword.length < 1) {
    return matches
  }

  for (const [name, usernames] of Object.entries(users)) {
    for (const username of usernames) {
      if (username.toLowerCase().startsWith(keyword.toLowerCase())) {
        matches.push({
          key: username,
          name,
          username,
        })
      }
    }
  }

  return matches
}

const mentionPickerWithDismiss = defineTypeaheadPicker<MentionMatch>({
  trigger: /@/,
  keyword: /\w*/,
  getMatches: matchUsers,
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: `[${event.match.name}]`}),
    ],
  ],
  onDismiss: [
    ({event}) => [raise({type: 'delete', at: event.patternSelection})],
  ],
})

type OnDismissTestContext = Context & {
  stateLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: OnDismissTestContext) => {
      const {editor, locator} = await createTestEditor({
        children: <MentionPickerWithDismissPlugin />,
        schemaDefinition: defineSchema({}),
      })

      context.locator = locator
      context.editor = editor
      context.stateLocator = page.getByTestId('state')

      await vi.waitFor(() =>
        expect.element(context.stateLocator).toBeInTheDocument(),
      )
    }),
  ],
  featureText: onDismissFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the picker state is {string}',
      async (context: OnDismissTestContext, state: string) => {
        await vi.waitFor(() => {
          expect(context.stateLocator.element().textContent).toEqual(state)
        })
      },
    ),
    Then(
      'the editor text is {string}',
      async (context: OnDismissTestContext, text: string) => {
        await vi.waitFor(() => {
          // Editor uses \ufeff (zero-width non-breaking space) as placeholder when empty
          const actualText = context.locator.element().textContent ?? ''
          const normalizedText = actualText === '\ufeff' ? '' : actualText
          expect(normalizedText).toEqual(text)
        })
      },
    ),
    When('dismiss is sent to the picker', async () => {
      const dismissButton = page.getByTestId('dismiss-button')
      await dismissButton.click()
    }),
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

function MentionPickerWithDismissPlugin() {
  const picker = useTypeaheadPicker(mentionPickerWithDismiss)

  return (
    <>
      <div data-testid="state">{getPickerState(picker)}</div>
      <button
        type="button"
        data-testid="dismiss-button"
        onClick={() => picker.send({type: 'dismiss'})}
      >
        Dismiss
      </button>
    </>
  )
}
