import {insert, set, unset, type Patch} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {
  createTestKeyGenerator,
  fromTextspec,
  toTextspec,
} from '@portabletext/test'
import {vi} from 'vitest'
import {createIo, getUnsentPatches} from '../create-io'
import {diffValue} from '../diff'
import type {
  EditorEventForIo,
  EditorForIo,
  EditorMessageForIo,
  IoEvent,
  IoMessage,
} from '../types'
import {applyOnServer} from './fake-server'

const schema = compileSchema(
  defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
)

type Document = Array<PortableTextBlock> | undefined

type Mutation = Extract<IoEvent, {type: 'mutation'}> & {makes: Document}

type WorkDropped = Extract<IoEvent, {type: 'work dropped'}> & {
  wouldHaveMade: Document
}

export type Emission = Mutation | WorkDropped

/**
 * io between a fake editor and a fake host. The host follows the server's
 * copy with `applyOnServer`, never with io's own patch code, so what a
 * mutation makes is worked out apart from io.
 */
export type World = ReturnType<typeof createWorld>

export function createWorld() {
  const editor = createFakeEditor()
  const io = createIo({
    editor: editor.forIo,
    keyGenerator: createTestKeyGenerator('io-'),
  })
  const host = {
    root: {rev: undefined as string | undefined, value: undefined as Document},
    chain: new Map<
      string | undefined,
      {resultRev: string; patches: Array<Patch>}
    >(),
    open: [] as Array<Mutation>,
  }
  const mutations: Array<Mutation> = []
  const emissions: Array<Emission> = []
  const changes: Array<{patches: Array<Patch>; ahead: Document}> = []
  const lastInput = {
    emissions: [] as Array<Emission>,
    applied: [] as Array<Array<Patch>>,
    violations: 0,
  }
  const window = {start: 0, taken: 0}
  let debounceStartedAt: number | undefined

  editor.onApply((patches) => {
    lastInput.applied.push(patches)
  })
  io.on('mutation', (event) => {
    const makes = [
      ...host.open.map((open) => open.patches),
      event.patches,
    ].reduce<Document>(applyOnServer, serverValue())
    const mutation = {...event, makes}

    mutations.push(mutation)
    host.open.push(mutation)
    record(mutation)
  })
  io.on('work dropped', (event) => {
    record({...event, wouldHaveMade: wouldHaveMade(event.patches)})
  })

  function record(emission: Emission) {
    emissions.push(emission)
    lastInput.emissions.push(emission)
  }

  /**
   * Per the step vocabulary: a rejected mutation on the server's copy, and
   * an unsent edit on what was ahead of it when the editor made it.
   */
  function wouldHaveMade(patches: Array<Patch>): Document {
    if (mutations.some((sent) => sent.patches === patches)) {
      return applyOnServer(serverValue(), patches)
    }

    const change = changes.find((made) => made.patches.includes(patches[0]!))

    return applyOnServer(change?.ahead, patches)
  }

  function unsentMakes(): Document {
    return [
      ...host.open.map((open) => open.patches),
      ...getUnsentPatches(io),
    ].reduce<Document>(applyOnServer, serverValue())
  }

  function serverValue(): Document {
    return valueAt(undefined)
  }

  /**
   * The newest copy when `rev` is not on the delivered chain. A transaction
   * the server can't apply leaves the copy as it was.
   */
  function valueAt(rev: string | undefined): Document {
    let current = host.root.rev
    let value = host.root.value
    let next = host.chain.get(current)

    while (next !== undefined && current !== rev) {
      try {
        value = applyOnServer(value, next.patches)
      } catch {}
      current = next.resultRev
      next = host.chain.get(current)
    }

    return value
  }

  function headRev(): string | undefined {
    let rev = host.root.rev
    let next = host.chain.get(rev)

    while (next !== undefined) {
      rev = next.resultRev
      next = host.chain.get(rev)
    }

    return rev
  }

  /** A refused input leaves the host as it was. */
  function input(run: () => void) {
    const hostBefore = {
      root: host.root,
      chain: new Map(host.chain),
      open: [...host.open],
    }
    lastInput.emissions = []
    lastInput.applied = []
    lastInput.violations = 0
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      run()
    } catch (error) {
      if (!isRefusal(error)) {
        throw error
      }

      lastInput.violations++
      Object.assign(host, hostBefore)
    } finally {
      lastInput.violations += consoleError.mock.calls.filter(([message]) =>
        isRefusal(new Error(String(message))),
      ).length
      consoleError.mockRestore()
    }
  }

  function mutationId(number: number): string {
    return mutations[number - 1]?.id ?? String(number)
  }

  function mutation(number: number): Mutation {
    const found = mutations[number - 1]

    if (found === undefined) {
      throw new Error(`io sent no mutation ${number}`)
    }

    return found
  }

  function deliver(
    previousRev: string | undefined,
    resultRev: string,
    transactionId: string,
    patches: Array<Patch>,
  ) {
    host.chain.set(previousRev, {resultRev, patches})
    send({type: 'transaction', transactionId, previousRev, resultRev, patches})
  }

  function send(message: IoMessage) {
    io.send(message)
  }

  return {
    io,
    editor,
    lastInput,
    load(textspec: string, rev: number) {
      input(() => {
        const value = parse(textspec)
        host.root = {rev: String(rev), value}
        send({type: 'load', value, rev: String(rev)})
      })
    },
    ready() {
      input(() => editor.emit({type: 'ready'}))
    },
    change(textspec: string) {
      input(() => {
        if (getUnsentPatches(io).length === 0) {
          debounceStartedAt = Date.now()
        }

        const ahead = unsentMakes()
        const patches = editor.change(parse(textspec))
        changes.push({patches, ahead})
        editor.emit({type: 'change', patches})
      })
    },
    resync(
      textspec: string,
      rev: number,
      outcome?: {mutation: number; outcome: 'applied' | 'not applied'},
    ) {
      input(() => {
        const value = parse(textspec)
        host.root = {rev: String(rev), value}
        host.chain = new Map()
        host.open = []
        send({
          type: 'resync',
          value,
          rev: String(rev),
          ...(outcome === undefined
            ? {}
            : {
                outcomes: {
                  [mutation(outcome.mutation).id]: outcome.outcome,
                },
              }),
        })
      })
    },
    deliverTransaction(from: number, to: number, makes: string | undefined) {
      input(() => {
        const patches =
          makes === undefined
            ? []
            : blockPatches(valueAt(String(from)), parse(makes))
        deliver(String(from), String(to), `transaction ${to}`, patches)
      })
    },
    deliverPatches(from: number, to: number, patches: Array<Patch>) {
      input(() => {
        deliver(String(from), String(to), `transaction ${to}`, patches)
      })
    },
    comeBack(number: number, patches?: Array<Patch>) {
      input(() => {
        const sent = mutation(number)
        host.open = host.open.filter((open) => open !== sent)
        deliver(
          headRev(),
          sent.transactionId,
          sent.transactionId,
          patches ?? sent.patches,
        )
      })
    },
    reject(number: number) {
      input(() => {
        host.open = host.open.filter((open) => open.id !== mutationId(number))
        send({type: 'mutation rejected', id: mutationId(number)})
      })
    },
    nameTransaction(number: number, transactionId: string) {
      input(() => {
        const sent = mutations[number - 1]

        if (sent !== undefined) {
          const named = {...sent, transactionId}
          mutations[number - 1] = named
          host.open = host.open.map((open) => (open === sent ? named : open))
        }

        send({type: 'mutation sent', id: mutationId(number), transactionId})
      })
    },
    loseFeed() {
      input(() => send({type: 'feed lost'}))
    },
    close() {
      input(() => send({type: 'close'}))
    },
    wait(run: () => void) {
      input(run)
    },
    mutation,
    unsentMakes,
    debounceStartedAt() {
      return debounceStartedAt
    },
    windowEmissions(): Array<Emission> {
      return emissions.slice(window.start)
    },
    takeWorkDropped(): WorkDropped | undefined {
      const dropped = emissions
        .slice(window.start)
        .filter((emission) => emission.type === 'work dropped')
      const next = dropped[window.taken]

      if (next !== undefined) {
        window.taken++
      }

      return next
    },
    nextWindow() {
      window.start = emissions.length
      window.taken = 0
    },
  }
}

function isRefusal(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('io refused')
}

function createFakeEditor() {
  const listeners = new Set<(event: EditorEventForIo) => void>()
  const applyListeners = new Set<(patches: Array<Patch>) => void>()
  const editor = {
    value: undefined as Document,
    onApply(listener: (patches: Array<Patch>) => void) {
      applyListeners.add(listener)
    },
    emit(event: EditorEventForIo) {
      for (const listener of listeners) {
        listener(event)
      }
    },
    change(wanted: Document): Array<Patch> {
      const patches = diffValue(editor.value, wanted)
      editor.value = applyOnServer(editor.value, patches)
      return patches
    },
    forIo: {
      on: (type, listener) => {
        const typed = (event: EditorEventForIo) => {
          if (event.type === type) {
            listener(event as EditorEventForIo & {type: typeof type})
          }
        }
        listeners.add(typed)

        return {
          unsubscribe: () => {
            listeners.delete(typed)
          },
        }
      },
      send: (message: EditorMessageForIo) => {
        if (message.type === 'apply') {
          for (const listener of applyListeners) {
            listener(message.patches)
          }
          editor.value = applyOnServer(editor.value, message.patches)
        } else {
          editor.value = message.value
        }
      },
    } satisfies EditorForIo,
  }

  return editor
}

/**
 * The blocks a textspec describes. Keys the textspec doesn't write are
 * given by position, so two textspecs of one document agree on them: every
 * block and every child takes the next key of a test key generator, in
 * document order, and a block keyed in the textspec still takes one.
 * `B _key="b1": foo` has the span `k1`.
 */
export function parse(textspec: string): Array<PortableTextBlock> {
  const {blocks} = fromTextspec(
    {schema, keyGenerator: createTestKeyGenerator(generatedPrefix)},
    textspec,
  )
  const keyGenerator = createTestKeyGenerator()

  return blocks.map((block) => {
    const blockKey = keyGenerator()
    const children = Array.isArray(block['children'])
      ? block['children'].map((child: {_key: string}) => {
          const childKey = keyGenerator()

          return child._key.startsWith(generatedPrefix)
            ? {...child, _key: childKey}
            : child
        })
      : undefined

    return {
      ...block,
      _key: block._key.startsWith(generatedPrefix) ? blockKey : block._key,
      ...(children === undefined
        ? {}
        : {children, markDefs: block['markDefs'] ?? []}),
    }
  })
}

const generatedPrefix = 'generated-'

/**
 * The textspec of a value, with only the keys `textspec` writes, so keys
 * a scenario doesn't name are not compared.
 */
export function render(value: Document, textspec: string): string {
  const keys = new Set(
    fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator(generatedPrefix)},
      textspec,
    ).blocks.flatMap((block) =>
      block._key.startsWith(generatedPrefix) ? [] : [block._key],
    ),
  )

  return toTextspec(
    {schema, value: value ?? [], selection: null},
    {keys, singleLine: true},
  )
}

/**
 * Another writer's patches from `before` to `after`, a `set` per changed
 * block, so they apply the same when transactions arrive out of order.
 */
function blockPatches(
  before: Document,
  after: Array<PortableTextBlock>,
): Array<Patch> {
  if (before === undefined) {
    return [set(after, [])]
  }

  const afterKeys = new Set(after.map((block) => block._key))
  const beforeByKey = new Map(before.map((block) => [block._key, block]))
  const patches: Array<Patch> = before
    .filter((block) => !afterKeys.has(block._key))
    .map((block) => unset([{_key: block._key}]))

  after.forEach((block, index) => {
    const existing = beforeByKey.get(block._key)
    const previous = after[index - 1]

    if (existing === undefined) {
      patches.push(
        previous === undefined
          ? insert([block], 'before', [0])
          : insert([block], 'after', [{_key: previous._key}]),
      )
    } else if (JSON.stringify(existing) !== JSON.stringify(block)) {
      patches.push(set(block, [{_key: block._key}]))
    }
  })

  return patches
}
