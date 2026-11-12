import {test, expect} from '@playwright/test'
test.afterEach(() => {
  if (process.env['RACEJAR_PROBE'] !== 'fixed') expect('foo').toEqual('bar')
})
test('After assertion', () => {
  test.fail()
})
