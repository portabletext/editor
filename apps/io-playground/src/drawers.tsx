import {
  editorNames,
  type EditorName,
  type WorldSnapshot,
} from '@portabletext/io/testing'
import {createContext, useContext, type ReactNode} from 'react'
import {
  concepts,
  floorOnTransaction,
  floorRules,
  hostPresets,
  notationRules,
} from './concepts'
import {describeSource} from './narration'
import {
  Badge,
  Button,
  Empty,
  InfoMark,
  JsonView,
  plural,
  RevisionStep,
  WithCode,
} from './ui'

/**
 * What the details drawer shows. The drawer looks it up in the current
 * snapshot, so it follows the world as steps run.
 */
export type DetailsSelection =
  | {type: 'mutation'; editor: EditorName; mutationNumber: number}
  | {type: 'pending'; editor: EditorName; index: number}
  | {type: 'event'; editor: EditorName; index: number}
  | {type: 'transaction'; transactionId: string}
  | {type: 'message'; editor: EditorName; index: number}

export type Drawer =
  | {type: 'concepts'}
  | {type: 'details'; selection: DetailsSelection}

const OpenDetailsContext = createContext<(selection: DetailsSelection) => void>(
  () => {},
)

export const OpenDetailsProvider = OpenDetailsContext.Provider

export function useOpenDetails(): (selection: DetailsSelection) => void {
  return useContext(OpenDetailsContext)
}

export function DrawerView({
  drawer,
  snapshot,
  onClose,
}: {
  drawer: Drawer
  snapshot: WorldSnapshot
  onClose: () => void
}) {
  return drawer.type === 'concepts' ? (
    <DrawerShell title="Concepts" onClose={onClose}>
      <ConceptsList />
    </DrawerShell>
  ) : (
    <DrawerShell title="Details" onClose={onClose}>
      <Details selection={drawer.selection} snapshot={snapshot} />
    </DrawerShell>
  )
}

function DrawerShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="fixed inset-y-0 right-0 z-40 flex w-[32rem] max-w-full flex-col border-l border-gray-300 bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <Button onClick={onClose}>close</Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {children}
      </div>
    </aside>
  )
}

function ConceptsList() {
  return (
    <>
      <dl className="flex flex-col gap-2 text-sm">
        {concepts.map((concept) => (
          <div key={concept.name}>
            <dt className="font-semibold">{concept.name}</dt>
            <dd className="text-gray-700">
              <WithCode text={concept.definition} />
            </dd>
          </div>
        ))}
      </dl>
      <section aria-label="Host presets" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Host presets</h3>
        {hostPresets.map((preset) => (
          <p key={preset.shape} className="text-sm text-gray-700">
            <span className="font-semibold">{preset.label}.</span>{' '}
            <WithCode text={preset.description} />
          </p>
        ))}
      </section>
      <section aria-label="The floor" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">The floor</h3>
        <p className="text-sm text-gray-700">
          The shapes the editor can't hold at all. On a <code>load</code> or a{' '}
          <code>resync</code>, io repairs the copy before anything else and
          sends the repairs as its own work:
        </p>
        <dl className="flex flex-col gap-2 text-sm">
          {floorRules.map((rule) => (
            <div key={rule.phrase}>
              <dt className="font-semibold">
                <WithCode text={rule.shape} />
              </dt>
              <dd className="text-gray-700">
                <WithCode text={rule.onCopy} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-gray-700">
          <WithCode text={floorOnTransaction} />
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">State notation</h3>
        <p className="text-sm text-gray-700">
          Every state is textspec, the notation{' '}
          <code className="font-mono">@portabletext/test</code> reads and
          writes.
        </p>
        <dl className="flex flex-col gap-2 text-sm">
          {notationRules.map((rule) => (
            <div key={rule.notation} className="flex gap-3">
              <dt className="w-16 shrink-0 font-mono">{rule.notation}</dt>
              <dd className="text-gray-700">
                <WithCode text={rule.meaning} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}

function Details({
  selection,
  snapshot,
}: {
  selection: DetailsSelection
  snapshot: WorldSnapshot
}) {
  switch (selection.type) {
    case 'mutation':
      return <MutationDetails selection={selection} snapshot={snapshot} />
    case 'pending':
      return <PendingDetails selection={selection} snapshot={snapshot} />
    case 'event':
      return <EventDetails selection={selection} snapshot={snapshot} />
    case 'transaction':
      return <TransactionDetails selection={selection} snapshot={snapshot} />
    case 'message':
      return <MessageDetails selection={selection} snapshot={snapshot} />
  }
}

function MutationDetails({
  selection,
  snapshot,
}: {
  selection: Extract<DetailsSelection, {type: 'mutation'}>
  snapshot: WorldSnapshot
}) {
  const editor = snapshot.editors?.[selection.editor]
  const mutation = editor?.sentMutations[selection.mutationNumber - 1]

  if (!editor || !mutation || !snapshot.network || !snapshot.server) {
    return <Empty>This mutation isn't in the current world.</Empty>
  }

  const savedAs = snapshot.server.transactions.find(
    (transaction) =>
      transaction.source.type === 'mutations' &&
      transaction.source.mutations.some(
        (candidate) =>
          candidate.name === selection.editor &&
          candidate.mutationNumber === selection.mutationNumber,
      ),
  )
  const whereItIs = snapshot.network.saveRequests.some(
    (request) =>
      request.editor === selection.editor &&
      request.mutationNumber === selection.mutationNumber,
  )
    ? 'a save request, waiting for the server to receive it'
    : editor.inFlight?.mutationNumber === mutation.number
      ? snapshot.network.lostReplies.some(
          (reply) =>
            reply.editor === selection.editor &&
            reply.mutationNumber === mutation.number,
        )
        ? 'in flight: saved, but the reply was lost, so the host may retry it'
        : 'in flight: saved, waiting to come back on the feed'
      : editor.rejected?.mutationNumber === mutation.number
        ? 'rejected'
        : editor.echoed.some(
              (echoed) => echoed.mutationNumber === mutation.number,
            )
          ? 'a held echo: it came back inside a held transaction'
          : savedAs
            ? `on the server as ${savedAs.id}`
            : 'not on the server'

  return (
    <>
      <h3 className="flex items-center gap-1 text-sm font-semibold">
        {selection.editor}'s mutation {mutation.number}{' '}
        <InfoMark concept="mutation" />
      </h3>
      <Fields
        fields={[
          ['mutation', `${selection.editor}'s mutation ${mutation.number}`],
          ['transactionId', mutation.transactionId],
          ['final', mutation.final ? 'yes, sent on close' : 'no'],
          ['where it is', whereItIs],
          ['patches', plural(mutation.patchCount, 'patch')],
        ]}
      />
      <PatchesView patches={mutation.patches} />
    </>
  )
}

function PendingDetails({
  selection,
  snapshot,
}: {
  selection: Extract<DetailsSelection, {type: 'pending'}>
  snapshot: WorldSnapshot
}) {
  const editor = snapshot.editors?.[selection.editor]
  const change = editor?.pending[selection.index]

  if (!editor || !change) {
    return <Empty>This change isn't pending anymore.</Empty>
  }

  return (
    <>
      <h3 className="flex items-center gap-1 text-sm font-semibold">
        {selection.editor}'s pending change {selection.index + 1} of{' '}
        {editor.pending.length} <InfoMark concept="pending" />
      </h3>
      <Fields
        fields={[
          ['goes out', 'with the next mutation, once nothing is in flight'],
          ['patches', plural(change.patchCount, 'patch')],
        ]}
      />
      <PatchesView patches={change.patches} />
    </>
  )
}

function EventDetails({
  selection,
  snapshot,
}: {
  selection: Extract<DetailsSelection, {type: 'event'}>
  snapshot: WorldSnapshot
}) {
  const event = snapshot.editors?.[selection.editor]?.events[selection.index]

  if (event?.type === 'error') {
    return (
      <>
        <h3 className="flex items-center gap-1 text-sm font-semibold">
          {selection.editor}'s error <InfoMark concept="error" />
        </h3>
        <Fields
          fields={[
            ['reason', event.reason],
            ['transactionId', event.transactionId ?? 'none'],
            ['means', errorMeanings[event.reason]],
          ]}
        />
        {event.patch === undefined ? null : (
          <section aria-label="offending patch" className="flex flex-col gap-1">
            <h4 className="text-xs font-semibold text-gray-500">
              {event.reason === 'echo mismatch'
                ? 'the patch the editor never sent, above a path its mutation touched'
                : 'the patch'}
            </h4>
            <JsonView value={event.patch} />
          </section>
        )}
      </>
    )
  }

  if (event?.type === 'work dropped') {
    return (
      <>
        <h3 className="flex items-center gap-1 text-sm font-semibold">
          {selection.editor}'s dropped work <InfoMark concept="work dropped" />
        </h3>
        <Fields
          fields={[
            ['reason', event.reason],
            [
              'means',
              event.reason === 'no target'
                ? 'the unsent changes had nowhere to go: their target is gone'
                : event.reason === 'rejected'
                  ? 'the resync dropped the mutation the server refused'
                  : 'the editor closed while sending was blocked by a rejection',
            ],
            ['patches', plural(event.patchCount, 'patch')],
          ]}
        />
        <PatchesView patches={event.patches} />
      </>
    )
  }

  return <Empty>This event isn't in the current world.</Empty>
}

const errorMeanings = {
  'out of order':
    "a transaction didn't connect to the base revision within 10 s, so one is missing",
  'duplicate key':
    'a remote insert brought a key the editor already has or has sent',
  'patch failed': "a patch from the host couldn't be evaluated at all",
  'echo mismatch':
    "the editor's own transaction came back with a patch it never sent, above a path its mutation touched: the host widened its work",
  'invalid content':
    "a transaction left content the editor can't show: a block without a key or type, children that aren't a list of spans, or text that isn't a string",
}

function TransactionDetails({
  selection,
  snapshot,
}: {
  selection: Extract<DetailsSelection, {type: 'transaction'}>
  snapshot: WorldSnapshot
}) {
  const transaction = snapshot.server?.transactions.find(
    (candidate) => candidate.id === selection.transactionId,
  )

  if (!transaction || !snapshot.network || !snapshot.editors) {
    return <Empty>This transaction isn't in the current world.</Empty>
  }

  const {network, editors} = snapshot
  const waitingFor = editorNames.filter((name) =>
    network.feeds[name].some((item) => item.transactionId === transaction.id),
  )
  const heldBy = editorNames.filter((name) =>
    editors[name].held.some((held) => held.transactionId === transaction.id),
  )

  return (
    <>
      <h3 className="flex flex-wrap items-center gap-1 text-sm font-semibold">
        Transaction {transaction.id} <InfoMark concept="transaction" />
        {transaction.noop ? <Badge tone="gray">no change</Badge> : null}
      </h3>
      <Fields
        fields={[
          ['transactionId', transaction.id],
          [
            'previousRev → resultRev',
            <RevisionStep
              key="revisions"
              from={transaction.previousRev}
              to={transaction.resultRev}
            />,
          ],
          ['mutationIds', JSON.stringify(transaction.mutationIds)],
          ['carries', describeSource(transaction.source)],
          ['changed the field', transaction.noop ? 'no' : 'yes'],
          [
            'waiting on the feed for',
            waitingFor.length === 0 ? 'nobody' : waitingFor.join(', '),
          ],
          ['held by', heldBy.length === 0 ? 'nobody' : heldBy.join(', ')],
          ['patches', plural(transaction.patchCount, 'patch')],
        ]}
      />
      <PatchesView patches={transaction.patches} />
    </>
  )
}

function MessageDetails({
  selection,
  snapshot,
}: {
  selection: Extract<DetailsSelection, {type: 'message'}>
  snapshot: WorldSnapshot
}) {
  const message =
    snapshot.editors?.[selection.editor]?.messages[selection.index]

  if (!message) {
    return <Empty>This message isn't in the current world.</Empty>
  }

  const heading = (
    <h3 className="flex items-center gap-1 text-sm font-semibold">
      {selection.editor}'s message {selection.index + 1}: {message.type}{' '}
      <InfoMark concept="message path" />
    </h3>
  )
  const route = ['route', routeDescriptions[message.route]] as const

  switch (message.type) {
    case 'mutation':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              ['id', message.id],
              ['transactionId', `${message.transactionId}, proposed by io`],
              ['final', message.final ? 'yes, sent on close' : 'no'],
            ]}
          />
          <PatchesView patches={message.patches} />
        </>
      )
    case 'mutation sent':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              ['id', message.id],
              [
                'transactionId',
                `${message.transactionId}, the host's own: io now takes this transaction for the mutation's echo`,
              ],
            ]}
          />
        </>
      )
    case 'mutation rejected':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              ['id', message.id],
              ['means', 'the server refused the mutation for good'],
            ]}
          />
        </>
      )
    case 'feed lost':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              [
                'means',
                'the listener may have missed transactions: io is out of step until a resync',
              ],
            ]}
          />
        </>
      )
    case 'transaction':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              [
                'came from',
                message.via === 'feed'
                  ? "the host's listener"
                  : "the answer to the host's own save",
              ],
              ['transactionId', message.transactionId],
              [
                'previousRev → resultRev',
                <RevisionStep
                  key="revisions"
                  from={message.previousRev ?? null}
                  to={message.resultRev ?? null}
                />,
              ],
              ['patches', plural(message.patches.length, 'patch')],
              [
                'value',
                'value' in message
                  ? "the server's copy after the transaction: io takes it as the base"
                  : 'none: io applies the patches to its base',
              ],
            ]}
          />
          <PatchesView patches={message.patches} />
          {'value' in message ? (
            <JsonSection
              label="value"
              title="transaction.value, the field as the server holds it after the transaction"
              value={message.value}
            />
          ) : null}
        </>
      )
    case 'load':
    case 'resync':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              ...(message.route === 'host to io'
                ? [
                    ['rev', message.rev ?? 'no document'] as const,
                    [
                      'outcomes',
                      message.type === 'resync' && message.outcomes
                        ? JSON.stringify(message.outcomes)
                        : 'none',
                    ] as const,
                  ]
                : []),
            ]}
          />
          <JsonSection
            label="value"
            title={
              message.route === 'host to io'
                ? "the server's copy, as the host fetched it"
                : "the whole value io gave the editor, repaired to the floor, with io's unsent work on top"
            }
            value={message.value}
          />
        </>
      )
    case 'apply':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              [
                'patches',
                `${plural(message.patches.length, 'instruction')} for the editor's tree`,
              ],
              [
                'underneath',
                `${plural(message.underneath.length, 'patch')}, the transaction's own, for history`,
              ],
            ]}
          />
          <JsonSection
            label="apply instructions"
            title="patches: keyed instructions io authored from its working copy"
            value={message.patches}
          />
          <JsonSection
            label="underneath"
            title="underneath: the transaction's patches as they moved the base"
            value={message.underneath}
          />
        </>
      )
    case 're-submit':
      return (
        <>
          {heading}
          <Fields
            fields={[
              route,
              ['transactionId', message.transactionId],
              [
                'answer',
                message.answer.type === 'duplicate'
                  ? '409: the transaction ID exists, so the mutation had landed'
                  : message.answer.type === 'saved'
                    ? "saved: the mutation hadn't landed, and now has"
                    : `failed with ${message.answer.status}`,
              ],
            ]}
          />
        </>
      )
  }
}

const routeDescriptions = {
  'io to host': 'io → host',
  'host to io': 'host → io',
  'io to editor': 'io → the editor',
  'host to server': 'host → server, the frozen request sent again',
}

function JsonSection({
  label,
  title,
  value,
}: {
  label: string
  title: string
  value: unknown
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold text-gray-500">{title}</h4>
      <JsonView value={value} />
    </section>
  )
}

function Fields({
  fields,
}: {
  fields: ReadonlyArray<readonly [string, ReactNode]>
}) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      {fields.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="font-mono text-xs leading-5 text-gray-500">{name}</dt>
          <dd className="font-mono text-xs leading-5">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PatchesView({patches}: {patches: Array<unknown>}) {
  return (
    <section aria-label="patches" className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold text-gray-500">
        patches, as <code className="font-mono">@portabletext/patches</code>{' '}
        shapes them
      </h4>
      <JsonView value={patches} />
    </section>
  )
}
