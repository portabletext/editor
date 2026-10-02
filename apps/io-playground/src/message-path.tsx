import type {EditorName, PathMessage} from '@portabletext/io/testing'
import {useEffect, useRef} from 'react'
import {useOpenDetails} from './drawers'
import {Badge, DetailsLink, Empty, plural, Section} from './ui'

/**
 * Every message on the editor's path, oldest first: what io and its host
 * said to each other, what io sent the editor, and the host's re-submits.
 */
export function MessagePath({
  name,
  messages,
}: {
  name: EditorName
  messages: Array<PathMessage>
}) {
  const openDetails = useOpenDetails()
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current

    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages.length])

  return (
    <Section title="message path" concept="message path">
      {messages.length === 0 ? (
        <Empty>none</Empty>
      ) : (
        <ol
          ref={listRef}
          className="flex max-h-56 flex-col gap-0.5 overflow-auto rounded bg-white p-1 font-mono text-[11px] ring-1 ring-gray-200"
        >
          {messages.map((message, index) => (
            <li
              key={index}
              className="grid grid-cols-[6rem_minmax(0,1fr)] gap-1"
            >
              <span className={routeTones[message.route]}>
                {routeLabels[message.route]}
              </span>
              <span>
                <DetailsLink
                  label={`Details of ${name}'s message ${index + 1}`}
                  onClick={() =>
                    openDetails({type: 'message', editor: name, index})
                  }
                >
                  {message.type}
                </DetailsLink>{' '}
                <span className="text-gray-500">
                  {describeMessage(message)}
                </span>
                {message.type === 'mutation sent' ? (
                  <>
                    {' '}
                    <Badge tone="blue">host's own ID</Badge>
                  </>
                ) : null}
                {message.type === 'transaction' &&
                message.via === 'save reply' ? (
                  <>
                    {' '}
                    <Badge tone="blue">from its own save</Badge>
                  </>
                ) : null}
                {message.type === 'transaction' && 'value' in message ? (
                  <>
                    {' '}
                    <Badge tone="green">value</Badge>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

const routeLabels: Record<PathMessage['route'], string> = {
  'io to host': 'io → host',
  'host to io': 'host → io',
  'io to editor': 'io → editor',
  'host to server': 'host → server',
}

const routeTones: Record<PathMessage['route'], string> = {
  'io to host': 'text-violet-700',
  'host to io': 'text-sky-700',
  'io to editor': 'text-gray-500',
  'host to server': 'text-orange-700',
}

function describeMessage(message: PathMessage): string {
  switch (message.type) {
    case 'mutation':
      return `${message.id} · proposes ${message.transactionId} · ${plural(message.patches.length, 'patch')}${message.final ? ' · final' : ''}`
    case 'mutation sent':
      return `${message.id} went out as ${message.transactionId}`
    case 'mutation rejected':
      return message.id
    case 'transaction':
      return `${message.transactionId} · ${message.previousRev ?? '∅'} → ${message.resultRev ?? '∅'} · ${plural(message.patches.length, 'patch')}`
    case 'feed lost':
      return ''
    case 'load':
      return message.route === 'host to io'
        ? `at ${message.rev ?? 'no document'}`
        : describeValue(message.value)
    case 'resync':
      return message.route === 'host to io'
        ? [
            `at ${message.rev ?? 'no document'}`,
            ...Object.entries(message.outcomes ?? {}).map(
              ([mutationId, outcome]) => `${mutationId} ${outcome}`,
            ),
            ...(message.discardUnsent ? ['discarding unsent'] : []),
          ].join(' · ')
        : describeValue(message.value)
    case 'apply':
      return `${plural(message.patches.length, 'instruction')} · ${plural(message.underneath.length, 'patch')} underneath`
    case 're-submit':
      return `${message.transactionId} · ${describeAnswer(message.answer)}`
  }
}

function describeValue(value: Array<unknown> | undefined): string {
  return value === undefined ? 'no field' : plural(value.length, 'block')
}

function describeAnswer(
  answer: Extract<PathMessage, {type: 're-submit'}>['answer'],
): string {
  switch (answer.type) {
    case 'saved':
      return "saved: it hadn't landed, and now has"
    case 'duplicate':
      return '409: it had landed already'
    case 'failed':
      return `failed with ${answer.status}`
  }
}
