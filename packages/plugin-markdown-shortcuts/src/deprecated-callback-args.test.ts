import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {
  withDeprecatedLevel as WithDeprecatedLevel,
  withDeprecatedSchema as WithDeprecatedSchema,
} from './deprecated-callback-args'

// The warn-once flag lives at module scope, so each test needs its own
// fresh module instance to observe a first read in isolation.
async function importFresh() {
  vi.resetModules()
  return (await import('./deprecated-callback-args')) as {
    withDeprecatedSchema: typeof WithDeprecatedSchema
    withDeprecatedLevel: typeof WithDeprecatedLevel
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
      '[@portabletext/plugin-markdown-shortcuts] Reading the deprecated `schema` callback argument; read `context.schema` instead. It will be removed in the next major.',
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

describe('withDeprecatedLevel', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('reading `level` warns once and returns `props.level`', async () => {
    const {withDeprecatedLevel} = await importFresh()
    const arg = withDeprecatedLevel({props: {level: 2}})

    expect(arg.level).toBe(2)
    expect(arg.level).toBe(2)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      '[@portabletext/plugin-markdown-shortcuts] Reading the deprecated `level` callback argument; read `props.level` instead. It will be removed in the next major.',
    )
  })

  test('reading only `props.level` triggers no warning', async () => {
    const {withDeprecatedLevel} = await importFresh()
    const {props} = withDeprecatedLevel({props: {level: 2}})

    expect(props.level).toBe(2)

    expect(console.warn).not.toHaveBeenCalled()
  })
})
