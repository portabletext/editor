import {expect, test as base} from '@playwright/test'
import {After, Before} from '../src/hooks'
import {
  Feature,
  type PlaywrightContext,
  type PlaywrightFixtures,
} from '../src/playwright'
import {Given, Then} from '../src/step-definitions'
import {
  needsRequest,
  writesNote,
  type NoteContext,
  type NeedsRequest,
} from './other-module-steps'

const test = base.extend<{greeting: string}>({
  greeting: 'foo',
})
type GreetingContext = PlaywrightContext<
  Pick<PlaywrightFixtures<typeof test>, 'page' | 'greeting'>
>
type EmptyContext = PlaywrightContext<{}> & {note?: string}
type NoteRequest = NoteContext & NeedsRequest

Feature({
  test,
  fixtures: ['page', 'greeting'],
  featureText: `Feature: Extended fixtures
    Scenario: Greeting reaches the step and page
      Given a greeting`,
  stepDefinitions: [
    Given('a greeting', async (context: GreetingContext) => {
      const greeting: string = context.playwright.greeting
      expect(greeting).toEqual('foo')
      await context.playwright.page.setContent(`<h1>${greeting}</h1>`)
      await expect(context.playwright.page.getByRole('heading')).toHaveText(
        'foo',
      )
    }),
  ],
})

Feature({
  test,
  fixtures: [],
  featureText: `Feature: No fixtures
    Scenario: No browser is needed
      Given no fixtures`,
  hooks: [
    Before((context: EmptyContext) => {
      expect(Object.keys(context.playwright)).toEqual([])
      context.note = 'foo'
    }),
    After((context: EmptyContext) => {
      expect(Object.keys(context.playwright)).toEqual([])
      expect(context.note).toEqual('bar')
    }),
  ],
  stepDefinitions: [
    Given('no fixtures', (context: EmptyContext) => {
      expect(Object.keys(context.playwright)).toEqual([])
      expect(context.note).toEqual('foo')
      context.note = 'bar'
      // @ts-expect-error N7: `page` is not named
      context.playwright.page
    }),
  ],
})

Feature({
  fixtures: ['page', 'request'],
  featureText: `Feature: Request fixture
    Scenario: A step from another module receives request
      Then needs request`,
  stepDefinitions: [needsRequest],
})

Feature({
  fixtures: ['page'],
  featureText: `Feature: User state
    Scenario: Hooks and steps share a note
      When writing a note
      Then the note is set`,
  hooks: [
    Before(async (context: NoteContext) => {
      context.note = 'bar'
      await context.playwright.page.setContent('<p>foo</p>')
    }),
    After((context: NoteContext) => {
      expect(context.note).toEqual('foo')
    }),
  ],
  stepDefinitions: [
    writesNote,
    Then('the note is set', (context: NoteContext) => {
      const note: string | undefined = context.note
      expect(note).toEqual('foo')
      // @ts-expect-error N8: user state does not add `request`
      context.playwright.request
    }),
  ],
})

Feature({
  fixtures: ['page', 'page'],
  featureText: `Feature: Repeated fixtures
    Scenario: A repeated page fixture reaches the step
      Given a page with content`,
  stepDefinitions: [
    Given(
      'a page with content',
      async (context: PlaywrightContext<Pick<PlaywrightFixtures, 'page'>>) => {
        await context.playwright.page.setContent('<p>foo</p>')
        await expect(context.playwright.page.locator('p')).toHaveText('foo')
      },
    ),
  ],
})

const runNamedTest = base.extend<{run: string}>({run: 'foo'})

Feature({
  test: runNamedTest,
  fixtures: ['run'],
  featureText: `Feature: Fixture named run
    Scenario: A fixture named run reaches the step
      Given a fixture named run`,
  stepDefinitions: [
    Given(
      'a fixture named run',
      (
        context: PlaywrightContext<
          Pick<PlaywrightFixtures<typeof runNamedTest>, 'run'>
        >,
      ) => {
        expect(context.playwright.run).toEqual('foo')
      },
    ),
  ],
})

function invalidFeatures() {
  const featureText = 'Feature: Invalid fixtures'
  // @ts-expect-error N2: the imported step requires `request`
  Feature({fixtures: ['page'], featureText, stepDefinitions: [needsRequest]})
  // @ts-expect-error N3: `reqest` is not a fixture
  Feature({fixtures: ['page', 'reqest'], featureText, stepDefinitions: []})
  Feature({
    fixtures: ['page'],
    featureText,
    stepDefinitions: [
      writesNote,
      // @ts-expect-error N4: user state cannot supply an unnamed fixture
      Then('request', (context: NoteRequest) => {
        void context.playwright.request
      }),
    ],
  })
  Feature({
    fixtures: ['page'],
    featureText,
    hooks: [
      // @ts-expect-error N5: the hook requires an unnamed fixture
      Before(
        (context: PlaywrightContext<Pick<PlaywrightFixtures, 'request'>>) => {
          void context.playwright.request
        },
      ),
    ],
    stepDefinitions: [],
  })
  // @ts-expect-error N6: `greeting` requires the extended `test`
  Feature({fixtures: ['greeting'], featureText, stepDefinitions: []})
}
void invalidFeatures

const invalidNameTest = base.extend<{
  'bad-name': string
  'class': string
  'implements': string
}>({
  'bad-name': 'foo',
  'class': 'bar',
  'implements': 'baz',
})

base('rejects fixture names that are not plain JavaScript identifiers', () => {
  for (const name of ['bad-name', 'class', 'implements'] as const) {
    expect(() =>
      Feature({
        test: invalidNameTest,
        fixtures: [name],
        featureText: 'Feature: Invalid name',
        stepDefinitions: [],
      }),
    ).toThrow(
      `racejar: fixture name "${name}" is not a plain JavaScript identifier`,
    )
  }
})
