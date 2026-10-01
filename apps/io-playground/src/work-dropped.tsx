import type {
  BatchSnapshot,
  EditorName,
  HeardEvent,
} from '@portabletext/io/testing'
import {useState} from 'react'
import {decodeDiffText, describePatches} from './narration'
import {Button, plural} from './ui'

type Patch = BatchSnapshot['patches'][number]

type WorkDroppedEvent = Extract<HeardEvent, {type: 'work dropped'}>

/**
 * One notice per `work dropped` the editor heard and the user hasn't
 * dismissed, newest last: the reason, the text that was given up, and a way
 * to copy it.
 */
export function WorkDroppedNotices({
  name,
  events,
  dismissed,
  onDismiss,
}: {
  name: EditorName
  events: Array<HeardEvent>
  /** Indexes into `events` the user dismissed. */
  dismissed: Array<number>
  onDismiss: (index: number) => void
}) {
  const notices = events.flatMap((event, index) =>
    event.type === 'work dropped' && !dismissed.includes(index)
      ? [{event, index}]
      : [],
  )

  return notices.length === 0 ? null : (
    <ul aria-label={`${name}'s dropped work`} className="flex flex-col gap-1.5">
      {notices.map(({event, index}) => (
        <WorkDroppedNotice
          key={index}
          event={event}
          onDismiss={() => onDismiss(index)}
        />
      ))}
    </ul>
  )
}

function WorkDroppedNotice({
  event,
  onDismiss,
}: {
  event: WorkDroppedEvent
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)
  const text = droppedText(event.patches)

  return (
    <li
      role="status"
      className="flex flex-col gap-1 rounded border border-orange-300 bg-orange-50 p-2 text-xs text-orange-900"
    >
      <p>
        <span className="font-semibold">
          Unsaved work dropped: {event.reason}.
        </span>{' '}
        {reasonExplanations[event.reason]}
      </p>
      {text === '' ? (
        <p className="text-orange-800">
          {plural(event.patchCount, 'change')} with no text to copy:{' '}
          {describePatches(event.patches)}.
        </p>
      ) : (
        <pre className="rounded bg-white px-1.5 py-1 font-mono whitespace-pre-wrap ring-1 ring-orange-200">
          {text}
        </pre>
      )}
      <div className="flex gap-1">
        {text === '' ? null : (
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(text).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? 'copied' : 'copy the text'}
          </Button>
        )}
        <Button onClick={onDismiss}>dismiss</Button>
      </div>
    </li>
  )
}

const reasonExplanations: Record<WorkDroppedEvent['reason'], string> = {
  'no target':
    'Another change removed what these edits were for, so they have nowhere to go.',
  'rejected':
    'The server refused the batch for good, and the resync let go of it.',
  'closed while blocked':
    'The editor closed while sending was blocked by a rejection, so these edits never went out.',
  'closed out of step':
    'The editor closed while it was out of step with the server, so these edits never went out.',
}

/**
 * The text the dropped patches carried, one line per patch that carries
 * any: a span's text for a `set` of it, the typed text for a
 * `diffMatchPatch`, and the text of each block or span an `insert` or a
 * `set` of a whole node held.
 */
export function droppedText(patches: Array<Patch>): string {
  return patches.flatMap(patchText).join('\n')
}

function patchText(patch: Patch): Array<string> {
  switch (patch.type) {
    case 'insert':
      return patch.items.flatMap(nodeText)
    case 'set':
      return typeof patch.value === 'string'
        ? patch.path.at(-1) === 'text'
          ? [patch.value]
          : []
        : nodeText(patch.value)
    case 'diffMatchPatch': {
      const added = decodeDiffText(patch.value.split('\n'), '+')

      return added === undefined || added === '' ? [] : [added]
    }
    default:
      return []
  }
}

function nodeText(node: unknown): Array<string> {
  if (typeof node !== 'object' || node === null) {
    return []
  }

  const children: unknown = Reflect.get(node, 'children')

  if (Array.isArray(children)) {
    return [children.flatMap(nodeText).join('')]
  }

  const text: unknown = Reflect.get(node, 'text')

  return typeof text === 'string' ? [text] : []
}
