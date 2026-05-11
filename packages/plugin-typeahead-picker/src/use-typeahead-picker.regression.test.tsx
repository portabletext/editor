import {raise} from '@portabletext/editor/behaviors'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {useRef} from 'react'
import {expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {defineTypeaheadPicker} from './define-typeahead-picker'
import {useTypeaheadPicker} from './use-typeahead-picker'

/**
 * Regression test for the typeahead picker hook's stability under
 * repeated renders. Runs in a vitest project that does not enable
 * `babel-plugin-react-compiler`, mirroring consumer environments that
 * have not opted into React Compiler memoisation.
 *
 * Without the fix, `useTypeaheadPicker` builds a fresh state machine
 * inside `useActor` on every render. When the picker becomes active,
 * the new machine emits state updates that re-render the component,
 * which builds a new machine, which emits more updates - React's
 * recursion guard fires and the component crashes with
 * "Too many re-renders".
 *
 * The fix wraps `createTypeaheadPickerMachine` in `useMemo` so the
 * actor logic passed to `useActor` is stable for the lifetime of the
 * hook.
 */

type MentionMatch = {
  key: string
  name: string
}

const users: Record<string, Array<string>> = {
  'John Doe': ['john'],
  'Jane Smith': ['jane'],
}

async function getMatches({
  keyword,
}: {
  keyword: string
}): Promise<Array<MentionMatch>> {
  await new Promise((resolve) => setTimeout(resolve, 10))
  const matches: Array<MentionMatch> = []
  if (keyword.length < 1) {
    return matches
  }
  for (const name in users) {
    const usernames = users[name] ?? []
    for (const username of usernames) {
      if (username.includes(keyword.toLowerCase())) {
        matches.push({key: `${name}-${username}`, name})
      }
    }
  }
  return matches
}

const mentionPicker = defineTypeaheadPicker<MentionMatch>({
  mode: 'async',
  trigger: /@/,
  keyword: /\w*/,
  getMatches,
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.name}),
    ],
  ],
})

test('does not infinite-loop when the picker becomes active', async () => {
  const renderCounts: Array<number> = []

  function PickerProbe() {
    const renderRef = useRef(0)
    renderRef.current += 1
    renderCounts.push(renderRef.current)

    const picker = useTypeaheadPicker(mentionPicker)
    const state = picker.snapshot.matches('idle')
      ? 'idle'
      : picker.snapshot.matches({active: 'loading'})
        ? 'loading'
        : picker.snapshot.matches({active: 'no matches'})
          ? 'no matches'
          : picker.snapshot.matches({active: 'showing matches'})
            ? 'showing matches'
            : 'unknown'

    return (
      <>
        <div data-testid="keyword">{picker.snapshot.context.keyword}</div>
        <div data-testid="state">{state}</div>
      </>
    )
  }

  const {locator} = await createTestEditor({
    children: <PickerProbe />,
    schemaDefinition: defineSchema({}),
  })

  const stateLocator = page.getByTestId('state')
  await vi.waitFor(() => expect.element(stateLocator).toBeInTheDocument())
  expect(stateLocator.element().textContent).toEqual('idle')

  await userEvent.click(locator)
  await userEvent.type(locator, '@j')

  await vi.waitFor(() => {
    expect(stateLocator.element().textContent).toEqual('showing matches')
  })

  expect(page.getByTestId('keyword').element().textContent).toEqual('j')

  // A stable hook re-renders a small number of times as the actor
  // transitions through its states. The infinite-loop bug produces
  // hundreds of renders before React aborts. The bound here is
  // generous to absorb harmless transient renders while still
  // catching the regression.
  expect(renderCounts.length).toBeLessThan(50)
})
