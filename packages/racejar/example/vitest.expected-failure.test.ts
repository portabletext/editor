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
      expect(module!.state()).toEqual(
        mode === 'fixed' || mode === 'stale' || mode === 'ordinary-broken'
          ? 'failed'
          : 'passed',
      )
      if (mode === 'stale') {
        expect(module!.errors().map((error) => error.message)).toEqual([
          'Expected failure predicate matched no scenario rows',
        ])
      }
      if (mode === 'fixed') {
        expect(results).toEqual([
          {name: 'marked', state: 'failed'},
          {name: 'ordinary', state: 'passed'},
        ])
      }
      if (mode === 'ordinary-broken') {
        expect(results).toEqual([
          {name: 'marked', state: 'passed'},
          {name: 'ordinary', state: 'failed'},
        ])
      }
      if (mode === 'skip') {
        expect(results).toEqual([
          {name: 'marked', state: 'skipped'},
          {name: 'ordinary', state: 'passed'},
        ])
      }
      if (mode === 'only') {
        expect(results).toEqual([
          {name: 'marked', state: 'passed'},
          {name: 'ordinary', state: 'skipped'},
        ])
      }
      if (mode === 'broken') {
        expect(results).toEqual([
          {name: 'marked', state: 'passed'},
          {name: 'ordinary', state: 'passed'},
        ])
      }
    } finally {
      await runner.close()
      process.exitCode = exitCode
      if (previousMode === undefined) {
        delete process.env['RACEJAR_PROBE']
      } else {
        process.env['RACEJAR_PROBE'] = previousMode
      }
    }
  }
}, 60_000)
