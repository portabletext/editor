import {createParameterType, Given, Then, When as RacejarWhen} from 'racejar'
import {expect, vi} from 'vitest'
import {gapWait, maxDebounceWait, quietWait} from '../io-machine'
import {fromSanityPatches} from './sanity-patches'
import {createWorld, parse, render, type World} from './world'

export type Context = {world: World; lastStep?: 'When' | 'Then'}

type MutationOutcome = {mutation: number; outcome: 'applied' | 'not applied'}

export const parameterTypes = [
  createParameterType<string>({
    name: 'pt',
    matcher: /"((?:[^"\\]|\\.)*)"/,
    transform: (textspec) => textspec.replaceAll('\\"', '"'),
  }),
  createParameterType<MutationOutcome>({
    name: 'outcome',
    matcher: /mutation (\d+) (applied|not applied)/,
    transform: (mutation, outcome) => ({
      mutation: Number(mutation),
      outcome: outcome === 'applied' ? 'applied' : 'not applied',
    }),
  }),
]

/**
 * A `When` after `Then` steps opens a new window: the emissions of the
 * `When` steps before the next `Then`. "io sends mutation N" asserts N is
 * the last mutation of the window, "io reports work dropped" takes the
 * window's next work dropped, and "io sends no mutation" asserts the last
 * input emitted no mutation.
 */
function When<TParamA, TParamB, TParamC>(
  text: string,
  callback: (
    context: Context,
    paramA: TParamA,
    paramB: TParamB,
    paramC: TParamC,
  ) => void,
) {
  return RacejarWhen<Context, TParamA, TParamB, TParamC>(text, ((
    context: Context,
    paramA: TParamA,
    paramB: TParamB,
    paramC: TParamC,
  ) => {
    if (context.lastStep !== 'When') {
      context.world.nextWindow()
    }

    context.lastStep = 'When'
    callback(context, paramA, paramB, paramC)
  }) as never)
}

export const stepDefinitions = [
  Given('a new io', (context: Context) => {
    vi.useFakeTimers()
    context.world = createWorld()
  }),
  Given('the document is {pt}', (context: Context, textspec: string) => {
    vi.useFakeTimers()
    context.world = createWorld()
    context.world.load(textspec, 1)
    context.world.ready()
    context.world.nextWindow()
  }),

  When(
    'the editor changes it to {pt}',
    (context: Context, textspec: string) => {
      context.world.change(textspec)
    },
  ),
  When(
    'the host loads {pt} at revision {int}',
    (context: Context, textspec: string, rev: number) => {
      context.world.load(textspec, rev)
    },
  ),
  When('the editor becomes ready', (context: Context) => {
    context.world.ready()
  }),
  When(
    'the host resyncs with {pt} at revision {int}',
    (context: Context, textspec: string, rev: number) => {
      context.world.resync(textspec, rev)
    },
  ),
  When(
    'the host resyncs with {pt} at revision {int}, {outcome}',
    (
      context: Context,
      textspec: string,
      rev: number,
      outcome: MutationOutcome,
    ) => {
      context.world.resync(textspec, rev, outcome)
    },
  ),
  When(
    'the host delivers a transaction from revision {int} to {int}',
    (context: Context, from: number, to: number) => {
      context.world.deliverTransaction(from, to, undefined)
    },
  ),
  When(
    'the host delivers a transaction from revision {int} to {int} that makes it {pt}',
    (context: Context, from: number, to: number, textspec: string) => {
      context.world.deliverTransaction(from, to, textspec)
    },
  ),
  When(
    'the host delivers a transaction from revision {int} to {int}:',
    (context: Context, from: number, to: number, patches: string) => {
      context.world.deliverPatches(from, to, fromSanityPatches(patches))
    },
  ),
  When(
    'the host reports mutation {int} comes back',
    (context: Context, mutation: number) => {
      context.world.comeBack(mutation)
    },
  ),
  When(
    'the host reports mutation {int} comes back changed:',
    (context: Context, mutation: number, patches: string) => {
      context.world.comeBack(mutation, fromSanityPatches(patches))
    },
  ),
  When(
    'the host reports mutation {int} is rejected',
    (context: Context, mutation: number) => {
      context.world.reject(mutation)
    },
  ),
  When(
    'the host reports mutation {int} was sent as transaction {string}',
    (context: Context, mutation: number, transactionId: string) => {
      context.world.nameTransaction(mutation, transactionId)
    },
  ),
  When('the host reports the feed is lost', (context: Context) => {
    context.world.loseFeed()
  }),
  When('the host asks io to close', (context: Context) => {
    context.world.close()
  }),
  When('the quiet wait runs out', (context: Context) => {
    context.world.wait(() => vi.advanceTimersByTime(quietWait))
  }),
  When('most of the quiet wait passes', (context: Context) => {
    context.world.wait(() => vi.advanceTimersByTime(quietWait - 100))
  }),
  When('the max debounce wait runs out', (context: Context) => {
    const startedAt = context.world.debounceStartedAt() ?? Date.now()

    context.world.wait(() =>
      vi.advanceTimersByTime(startedAt + maxDebounceWait - Date.now()),
    )
  }),
  When('the gap wait runs out', (context: Context) => {
    context.world.wait(() => vi.advanceTimersByTime(gapWait))
  }),

  Then('the editor shows {pt}', (context: Context, textspec: string) => {
    context.lastStep = 'Then'
    expect(render(context.world.editor.value, textspec)).toEqual(
      render(parse(textspec), textspec),
    )
  }),
  Then('the editor is applied:', (context: Context, patches: string) => {
    context.lastStep = 'Then'
    expect(context.world.lastInput.applied).toEqual([
      fromSanityPatches(patches),
    ])
  }),
  Then(
    'io sends mutation {int} that makes it {pt}',
    (context: Context, number: number, textspec: string) => {
      context.lastStep = 'Then'
      expectMutation(context, number, textspec, undefined)
    },
  ),
  Then(
    'io sends mutation {int} that makes it {pt}, marked final',
    (context: Context, number: number, textspec: string) => {
      context.lastStep = 'Then'
      expectMutation(context, number, textspec, true)
    },
  ),
  Then('io sends no mutation', (context: Context) => {
    context.lastStep = 'Then'
    expect(
      context.world.lastInput.emissions.filter(
        (emission) => emission.type === 'mutation',
      ),
    ).toEqual([])
  }),
  Then(
    'io reports work dropped that would have made it {pt}, with reason {string}',
    (context: Context, textspec: string, reason: string) => {
      context.lastStep = 'Then'
      const workDropped = context.world.takeWorkDropped()

      expect(
        workDropped === undefined
          ? undefined
          : {
              makes: render(workDropped.wouldHaveMade, textspec),
              reason: workDropped.reason,
            },
      ).toEqual({makes: render(parse(textspec), textspec), reason})
    },
  ),
  Then("io's sync is {string}", (context: Context, sync: string) => {
    context.lastStep = 'Then'
    expect(context.world.io.getSnapshot().value).toEqual({ready: sync})
  }),
  Then('io is loading', (context: Context) => {
    context.lastStep = 'Then'
    expect(context.world.io.getSnapshot().value).toEqual('loading')
  }),
  Then('io is closed', (context: Context) => {
    context.lastStep = 'Then'
    expect(context.world.io.getSnapshot().value).toEqual('closed')
  }),
  Then(
    'io has mutation {int} in flight',
    (context: Context, number: number) => {
      context.lastStep = 'Then'
      const mutation = context.world.mutation(number)

      expect(context.world.io.getSnapshot().context.inFlight).toEqual({
        id: mutation.id,
        transactionId: mutation.transactionId,
      })
    },
  ),
  Then(
    'io has mutation {int} in flight that makes it {pt}',
    (context: Context, number: number, textspec: string) => {
      context.lastStep = 'Then'
      const mutation = context.world.mutation(number)

      expect({
        inFlight: context.world.io.getSnapshot().context.inFlight,
        makes: render(mutation.makes, textspec),
      }).toEqual({
        inFlight: {id: mutation.id, transactionId: mutation.transactionId},
        makes: render(parse(textspec), textspec),
      })
    },
  ),
  Then(
    "io's unsent edits make it {pt}",
    (context: Context, textspec: string) => {
      context.lastStep = 'Then'
      expect(render(context.world.unsentMakes(), textspec)).toEqual(
        render(parse(textspec), textspec),
      )
    },
  ),
  Then('io refuses the input as a violation', (context: Context) => {
    context.lastStep = 'Then'
    expect(context.world.lastInput.violations).toEqual(1)
  }),

  ...[
    When('the host asks io to discard', notIn1),
    When('the host asks io to repair', notIn1),
    When('the editor corrects it to {pt}', notIn1),
    When('the stalled wait runs out', notIn1),
    Then('the editor is read-only', notIn1),
    Then('the editor is not read-only', notIn1),
  ],
]

/**
 * Steps of the validity slice, which 1.0 leaves out. Their scenarios are
 * skipped, but racejar binds every step of a feature.
 */
function notIn1(): never {
  throw new Error('Not in `@portabletext/io` 1.0')
}

function expectMutation(
  context: Context,
  number: number,
  textspec: string,
  final: true | undefined,
) {
  const last = context.world
    .windowEmissions()
    .filter((emission) => emission.type === 'mutation')
    .at(-1)

  expect(
    last === undefined
      ? undefined
      : {
          id: last.id,
          makes: render(last.makes, textspec),
          final: last.final,
        },
  ).toEqual({
    id: context.world.mutation(number).id,
    makes: render(parse(textspec), textspec),
    final,
  })
}
