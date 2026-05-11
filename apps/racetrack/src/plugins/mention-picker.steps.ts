/**
 * Plugin-specific Then-steps for the mention-picker scenarios.
 *
 * The first four assert against the `data-testid` nodes that
 * `MentionPickerPlugin` renders. The fifth asserts against the
 * module-scoped `getMatchesCallCount` from `./mention-picker`. Each
 * scenario's Before hook resets that counter; without the reset,
 * counts accumulate across scenarios.
 */

import type {Context} from '@portabletext/editor/test/vitest'
import {Then} from 'racejar'
import {expect, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import {getMatchesCallCountValue} from './mention-picker'

export type MentionPickerContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
  stateLocator: Locator
  selectedIndexLocator: Locator
}

export function attachLocators(context: MentionPickerContext): void {
  context.keywordLocator = page.getByTestId('keyword')
  context.matchesLocator = page.getByTestId('matches')
  context.stateLocator = page.getByTestId('state')
  context.selectedIndexLocator = page.getByTestId('selectedIndex')
}

export const mentionPickerSteps = [
  Then(
    'the keyword is {string}',
    async (context: MentionPickerContext, keyword: string) => {
      await vi.waitFor(() => {
        expect(context.keywordLocator.element().textContent).toEqual(keyword)
      })
    },
  ),
  Then(
    'the matches are {string}',
    async (context: MentionPickerContext, matches: string) => {
      await vi.waitFor(() => {
        expect(context.matchesLocator.element().textContent).toEqual(matches)
      })
    },
  ),
  Then(
    'the picker state is {string}',
    async (context: MentionPickerContext, state: string) => {
      await vi.waitFor(() => {
        expect(context.stateLocator.element().textContent).toEqual(state)
      })
    },
  ),
  Then(
    'the selected index is {string}',
    async (context: MentionPickerContext, index: string) => {
      await vi.waitFor(() => {
        expect(context.selectedIndexLocator.element().textContent).toEqual(
          index,
        )
      })
    },
  ),
  Then(
    'getMatches was called {string} times',
    (_context: MentionPickerContext, count: string) => {
      expect(getMatchesCallCountValue()).toEqual(Number(count))
    },
  ),
]
