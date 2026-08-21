import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {compileSchema as CompileSchema} from './compile-schema'
import type {defineSchema as DefineSchema} from './define-schema'
import type {withDeprecatedValue as WithDeprecatedValue} from './deprecated-value'
import type {getSubSchema as GetSubSchema} from './get-sub-schema'

// The warn-once flag lives at module scope, so each test needs its own
// fresh module instance to observe a first read in isolation.
async function importFresh() {
  vi.resetModules()
  return (await import('./deprecated-value')) as {
    withDeprecatedValue: typeof WithDeprecatedValue
  }
}

async function importFreshProductionPath() {
  vi.resetModules()
  const [{compileSchema}, {defineSchema}, {getSubSchema}] = await Promise.all([
    import('./compile-schema'),
    import('./define-schema'),
    import('./get-sub-schema'),
  ])
  return {
    compileSchema: compileSchema as typeof CompileSchema,
    defineSchema: defineSchema as typeof DefineSchema,
    getSubSchema: getSubSchema as typeof GetSubSchema,
  }
}

describe('withDeprecatedValue', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('reading `value` warns once and returns `name`', async () => {
    const {withDeprecatedValue} = await importFresh()
    const style = withDeprecatedValue({name: 'h1', title: 'Heading 1'})

    expect(style.value).toBe('h1')
    expect(style.value).toBe('h1')

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      '[@portabletext/schema] Reading the deprecated `value` on compiled schema types; read `name` instead. `value` will be removed in the next major.',
    )
  })

  test('reading only `name` triggers no warning', async () => {
    const {withDeprecatedValue} = await importFresh()
    const style = withDeprecatedValue({name: 'h1', title: 'Heading 1'})

    expect(style.name).toBe('h1')

    expect(console.warn).not.toHaveBeenCalled()
  })

  test('spread and `toEqual` still see `value`', async () => {
    const {withDeprecatedValue} = await importFresh()
    const style = withDeprecatedValue({name: 'h1', title: 'Heading 1'})

    expect({...style}).toEqual({name: 'h1', title: 'Heading 1', value: 'h1'})
    expect(style).toEqual({name: 'h1', title: 'Heading 1', value: 'h1'})
  })

  test('re-wrapping an already-wrapped definition does not warn and returns it unchanged', async () => {
    const {withDeprecatedValue} = await importFresh()
    const style = withDeprecatedValue({name: 'h1', title: 'Heading 1'})

    const rewrapped = withDeprecatedValue(style)

    expect(console.warn).not.toHaveBeenCalled()
    expect(rewrapped).toBe(style)
  })

  test('assigning `value` replaces the getter and reads back without warning or throwing', async () => {
    const {withDeprecatedValue} = await importFresh()
    const style = withDeprecatedValue({name: 'h1', title: 'Heading 1'})

    expect(() => {
      style.value = 'custom'
    }).not.toThrow()

    expect(style.value).toBe('custom')
    expect(console.warn).not.toHaveBeenCalled()
  })

  test('production path: resolving a nested block sub-schema warns zero times until a consumer reads `value`', async () => {
    const {compileSchema, defineSchema, getSubSchema} =
      await importFreshProductionPath()

    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'tableCell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    styles: [{name: 'h1'}],
                    decorators: [{name: 'strong'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(console.warn).not.toHaveBeenCalled()

    const tableCell = schema.blockObjects[0]
    const of = tableCell?.fields?.[0]
    if (of?.type !== 'array' || !of.of) {
      throw new Error('expected a compiled array field with `of`')
    }

    const subSchema = getSubSchema(schema, of.of)
    const style = subSchema.styles[0]
    if (!style) {
      throw new Error('expected a resolved style')
    }

    expect(console.warn).not.toHaveBeenCalled()

    expect(style.value).toBe('h1')

    expect(console.warn).toHaveBeenCalledTimes(1)
  })
})
