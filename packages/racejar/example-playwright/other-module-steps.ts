import {expect} from '@playwright/test'
import type {PlaywrightContext, PlaywrightFixtures} from '../src/playwright'
import {Then, When} from '../src/step-definitions'

export type NeedsRequest = PlaywrightContext<
  Pick<PlaywrightFixtures, 'page' | 'request'>
>
export const needsRequest = Then('needs request', (context: NeedsRequest) => {
  expect(typeof context.playwright.request.get).toEqual('function')
})

export type NoteContext = PlaywrightContext<
  Pick<PlaywrightFixtures, 'page'>
> & {note?: string}
export const writesNote = When('writing a note', (context: NoteContext) => {
  context.note = 'foo'
})
