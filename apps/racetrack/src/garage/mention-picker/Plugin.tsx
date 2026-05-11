/**
 * Mention-picker plugin host, lifted from
 * `packages/plugin-typeahead-picker/src/mention-picker.test.tsx`.
 *
 * `MentionPickerPlugin` is the React component that wires the
 * typeahead picker into the surrounding `EditorProvider` and renders
 * the diagnostic `data-testid` nodes (`keyword`, `matches`, `state`,
 * `selectedIndex`). The scenarios assert against those nodes, so the
 * markup is kept faithful.
 *
 * The picker is defined at module scope (matching the original test
 * file). Building a new picker per component instance via `useMemo`
 * triggers infinite re-renders under React StrictMode, because the
 * picker's internal actor subscription invalidates on each remount.
 */

import {raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'

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

let getMatchesCallCount = 0

export function getMatchesCallCountValue(): number {
  return getMatchesCallCount
}

export function resetMatchesCallCount(): void {
  getMatchesCallCount = 0
}

async function getMatches({
  keyword,
}: {
  keyword: string
}): Promise<Array<MentionMatch>> {
  getMatchesCallCount++
  await new Promise((resolve) => setTimeout(resolve, 50))

  const foundUsers: Array<MentionMatch> = []
  if (keyword.length < 1) {
    return foundUsers
  }

  for (const name in users) {
    const usernames = users[name] ?? []
    for (const username of usernames) {
      const keywordIndex = username.indexOf(keyword.toLowerCase())
      if (keywordIndex === -1) {
        continue
      }
      foundUsers.push({key: `${name}-${username}`, name, username})
    }
  }
  return foundUsers
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

export function MentionPickerPlugin() {
  const typeaheadPicker = useTypeaheadPicker(mentionPicker)
  const currentState = getPickerState(typeaheadPicker)

  return (
    <div className="rt-state">
      <span className="rt-state-label">keyword</span>
      <span className="rt-state-value" data-testid="keyword">
        {typeaheadPicker.snapshot.context.keyword}
      </span>
      <span className="rt-state-label">matches</span>
      <span className="rt-state-value" data-testid="matches">
        {typeaheadPicker.snapshot.context.matches
          .map((match) => match.name)
          .join(',')}
      </span>
      <span className="rt-state-label">state</span>
      <span className="rt-state-value" data-testid="state">
        {currentState}
      </span>
      <span className="rt-state-label">selectedIndex</span>
      <span className="rt-state-value" data-testid="selectedIndex">
        {typeaheadPicker.snapshot.context.selectedIndex}
      </span>
    </div>
  )
}
