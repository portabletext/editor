import {useEditor} from '@portabletext/editor'
import {effect, raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'
import Fuse from 'fuse.js'
import {useEffect, useRef} from 'react'
import {Button} from './primitives/button'
import {FloatingPanel} from './primitives/floating-panel'

const firstNames = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kate',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Paul',
  'Quinn',
  'Ruby',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xander',
  'Yara',
  'Zack',
  'Anna',
  'Ben',
  'Chloe',
  'Dan',
  'Emma',
  'Felix',
  'Gina',
  'Hugo',
  'Iris',
  'Jake',
  'Kira',
  'Liam',
  'Maya',
  'Nate',
]

const lastNames = [
  'Smith',
  'Johnson',
  'Brown',
  'Davis',
  'Wilson',
  'Moore',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
]

const users = Array.from({length: 400}, (_, i) => {
  const firstName = firstNames[i % firstNames.length]
  const lastName = lastNames[Math.floor(i / 40) % lastNames.length]
  const suffix = i >= 40 ? Math.floor(i / 40) : ''
  return {
    id: String(i + 1),
    name: `${firstName} ${lastName}`,
    username: `${firstName.toLowerCase()}${suffix}`,
  }
})

type MentionMatch = {
  key: string
  userId: string
  name: string
  username: string
}

const usersFuse = new Fuse(users, {
  keys: [
    {name: 'name', weight: 1.0},
    {name: 'username', weight: 0.8},
  ],
  threshold: 0.4,
  ignoreLocation: true,
})

const MAX_MENTION_RESULTS = 50

async function matchUsers({
  keyword,
}: {
  keyword: string
}): Promise<MentionMatch[]> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100))

  if (!keyword) {
    return []
  }

  return usersFuse
    .search(keyword, {limit: MAX_MENTION_RESULTS})
    .map((result) => ({
      key: result.item.id,
      userId: result.item.id,
      name: result.item.name,
      username: result.item.username,
    }))
}

const mentionPicker = defineTypeaheadPicker<MentionMatch>({
  mode: 'async',
  trigger: /@/,
  keyword: /\w*/,
  debounceMs: 50,
  getMatches: matchUsers,
  actions: [
    ({event, snapshot}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({
        type: 'insert.child',
        child: {
          _type: 'mention',
          _key: snapshot.context.keyGenerator(),
          userId: event.match.userId,
          name: event.match.name,
          username: event.match.username,
        },
      }),
      raise({
        type: 'move.forward',
        distance: 1,
      }),
    ],
    () => [
      // Clicking a match in the picker menu might have stolen focus, so let's
      // restore that.
      effect(({send}) => {
        send({type: 'focus'})
      }),
    ],
  ],
})

export function MentionPickerPlugin() {
  const editor = useEditor()
  const picker = useTypeaheadPicker(mentionPicker)
  const {keyword, matches, selectedIndex} = picker.snapshot.context

  const onDismiss = () => picker.send({type: 'dismiss'})
  const onNavigateTo = (index: number) =>
    picker.send({type: 'navigate to', index})
  const onSelect = () => picker.send({type: 'select'})

  const isActive = picker.snapshot.matches('active')
  const isLoading =
    picker.snapshot.matches({active: 'loading'}) ||
    picker.snapshot.matches({active: {'no matches': 'loading'}})
  const isRefreshing = picker.snapshot.matches({
    active: {'showing matches': 'loading'},
  })

  const getAnchorRect = () => editor.dom.getSelectionRect(editor.getSnapshot())

  if (!isActive || keyword.length < 1) {
    return null
  }

  return (
    <FloatingPanel getAnchorRect={getAnchorRect} offset={4}>
      <MentionListBox
        keyword={keyword}
        matches={matches}
        selectedIndex={selectedIndex}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onDismiss={onDismiss}
        onNavigateTo={onNavigateTo}
        onSelect={onSelect}
      />
    </FloatingPanel>
  )
}

function MentionListBox(props: {
  keyword: string
  matches: readonly MentionMatch[]
  selectedIndex: number
  isLoading: boolean
  isRefreshing: boolean
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  return (
    <div className={props.isRefreshing ? 'opacity-60' : ''}>
      {props.isLoading ? (
        <div className="p-2 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : props.matches.length === 0 ? (
        <div className="p-2 flex items-center gap-2 text-gray-700 dark:text-gray-200">
          No users matching "{props.keyword}"
          <Button size="sm" variant="secondary" onPress={props.onDismiss}>
            Dismiss
          </Button>
        </div>
      ) : (
        <ol className="p-1" style={{maxHeight: 200, overflowY: 'auto'}}>
          {props.matches.map((match, index) => (
            <MentionListItem
              key={match.key}
              match={match}
              selected={props.selectedIndex === index}
              onMouseEnter={() => props.onNavigateTo(index)}
              onSelect={props.onSelect}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function MentionListItem(props: {
  match: MentionMatch
  selected: boolean
  onMouseEnter: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }, [props.selected])

  return (
    <li
      ref={ref}
      className={`px-2 py-1 cursor-pointer rounded ${
        props.selected
          ? 'bg-blue-100 dark:bg-blue-900/50'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span className="font-medium">{props.match.name}</span>
      <span className="text-gray-500 dark:text-gray-400 ml-2">
        @{props.match.username}
      </span>
    </li>
  )
}
