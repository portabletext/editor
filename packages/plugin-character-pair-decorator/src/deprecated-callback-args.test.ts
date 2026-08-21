import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {withDeprecatedSchema as WithDeprecatedSchema} from './deprecated-callback-args'

// The warn-once flag lives at module scope, so each test needs its own
// fresh module instance to observe a first read in isolation.
async function importFresh() {
  vi.resetModules()
  return (await import('./deprecated-callback-args')) as {
    withDeprecatedSchema: typeof WithDeprecatedSchema
  }
}

describe('withDeprecatedSchema', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('reading `schema` warns once and returns `context.schema`', async () => {
    const {withDeprecatedSchema} = await importFresh()
    const arg = withDeprecatedSchema({context: {schema: 'the-schema'}})

    expect(arg.schema).toBe('the-schema')
    expect(arg.schema).toBe('the-schema')

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      '[@portabletext/plugin-character-pair-decorator] Reading the deprecated `schema` callback argument; read `context.schema` instead. It will be removed in the next major.',
    )
  })

  test('reading only `context.schema` triggers no warning', async () => {
    const {withDeprecatedSchema} = await importFresh()
    const {context} = withDeprecatedSchema({context: {schema: 'the-schema'}})

    expect(context.schema).toBe('the-schema')

    expect(console.warn).not.toHaveBeenCalled()
  })

  test('destructuring `schema` off the argument warns and works', async () => {
    const {withDeprecatedSchema} = await importFresh()
    const {schema} = withDeprecatedSchema({context: {schema: 'the-schema'}})

    expect(schema).toBe('the-schema')
    expect(console.warn).toHaveBeenCalledTimes(1)
  })
})
