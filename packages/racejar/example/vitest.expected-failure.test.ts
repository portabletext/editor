import {expect, test} from 'vitest'
import {startVitest} from 'vitest/node'

test('expected failures include After assertions and reject repairs and stale entries', async () => {
  for (const mode of [
    'broken',
    'fixed',
    'stale',
    'ordinary-broken',
    'skip',
    'only',
  ]) {
    const exitCode = process.exitCode
    const previousMode = process.env['RACEJAR_PROBE']
    process.env['RACEJAR_PROBE'] = mode
    const runner = await startVitest('test', [], {
      root: new URL('..', import.meta.url).pathname,
      config: false,
      watch: false,
      include: ['example/expected-failure.fixture.ts'],
      reporters: [],
    })
    try {
      const [module] = runner.state.getTestModules()
      const results = [...module!.children.allTests()].map((scenario) => ({
        name: scenario.name,
        state: scenario.result().state,
      }))
      console.log(
        JSON.stringify({
          mode,
          state: module!.state(),
          results,
          errors: module!.errors().map((error) => error.message),
        }),
      )
      expect(module!.state()).toEqual(
        mode === 'fixed' || mode === 'stale' || mode === 'ordinary-broken'
          ? 'failed'
          : 'passed',
      )
      if (mode === 'broken') {
        expect(results).toEqual([
          {name: 'marked', state: 'passed'},
          {name: 'ordinary', state: 'passed'},
        ])
      }
    } finally {
      await runner.close()
      process.exitCode = exitCode
      process.env['RACEJAR_PROBE'] = previousMode
    }
  }
}, 60_000)
