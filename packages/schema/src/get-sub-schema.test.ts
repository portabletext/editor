import {describe, expect, test} from 'vitest'
import {compileSchema} from './compile-schema'
import {defineSchema} from './define-schema'
import {getSubSchema} from './get-sub-schema'

describe(getSubSchema.name, () => {
  test('returns root inheritance when of contains only a {type: block} entry', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        styles: [{name: 'h1'}],
      }),
    )

    const result = getSubSchema(schema, [{type: 'block'}])

    expect(result.decorators.map((d) => d.name)).toEqual(['strong', 'em'])
    expect(result.styles.map((s) => s.name)).toEqual(['normal', 'h1'])
    expect(result.blockObjects).toEqual([])
  })

  test('overrides inheritance when {type: block} declares its own lists', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    )

    const result = getSubSchema(schema, [
      {
        type: 'block',
        decorators: [{name: 'strong'}],
      },
    ])

    expect(result.decorators.map((d) => d.name)).toEqual(['strong'])
  })

  test('non-block of members become block objects', () => {
    const schema = compileSchema(defineSchema({}))

    const result = getSubSchema(schema, [
      {type: 'block'},
      {type: 'image', name: 'image'},
      {type: 'embed', name: 'embed'},
    ])

    expect(result.blockObjects.map((b) => b.name)).toEqual(['image', 'embed'])
  })

  test('returns empty validation lists when no {type: block} entry is present', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'h1'}],
      }),
    )

    const result = getSubSchema(schema, [{type: 'image', name: 'image'}])

    expect(result.decorators).toEqual([])
    expect(result.styles).toEqual([])
    expect(result.blockObjects.map((b) => b.name)).toEqual(['image'])
    expect(result.block.name).toBe(schema.block.name)
    expect(result.span.name).toBe(schema.span.name)
  })

  test('uses block member name when declared, falls back to root block name otherwise', () => {
    const schema = compileSchema(defineSchema({block: {name: 'myBlock'}}))

    const withName = getSubSchema(schema, [{type: 'block', name: 'codeLine'}])
    expect(withName.block.name).toBe('codeLine')

    const withoutName = getSubSchema(schema, [{type: 'block'}])
    expect(withoutName.block.name).toBe('myBlock')
  })

  test('a bare reference resolves to the block object declared on the schema', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'list',
            fields: [
              {name: 'kind', type: 'string'},
              {
                name: 'items',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'list-item',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        of: [{type: 'block'}, {type: 'list'}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const result = getSubSchema(schema, [{type: 'block'}, {type: 'list'}])

    const list = result.blockObjects.find(
      (blockObject) => blockObject.name === 'list',
    )
    expect(list).toBe(
      schema.blockObjects.find((blockObject) => blockObject.name === 'list'),
    )
    expect(list?.fields.map((field) => field.name)).toEqual(['kind', 'items'])
  })

  test('inline fields win over a same-named schema declaration', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'note', fields: [{name: 'body', type: 'string'}]},
        ],
      }),
    )

    const result = getSubSchema(schema, [
      {type: 'object', name: 'note', fields: []},
    ])

    expect(
      result.blockObjects.find((blockObject) => blockObject.name === 'note')
        ?.fields,
    ).toEqual([])
  })

  test("a fieldless inline block object declaration does not take a same-named root type's fields", () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'note', fields: [{name: 'body', type: 'string'}]},
        ],
      }),
    )

    const result = getSubSchema(schema, [{type: 'object', name: 'note'}])

    expect(
      result.blockObjects.find((blockObject) => blockObject.name === 'note')
        ?.fields,
    ).toEqual([])
  })

  test('a reference to a type declared only inline resolves to no fields', () => {
    // Pins the boundary of reference resolution: only root-declared block
    // objects resolve. `callout` is declared inline inside `wrapper` and
    // referenced bare in the queried `of`; the sub-schema keeps it
    // fieldless rather than walking the `of` tree for the declaration.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'wrapper',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'callout',
                    fields: [{name: 'tone', type: 'string'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const result = getSubSchema(schema, [{type: 'callout'}])

    expect(
      result.blockObjects.find((blockObject) => blockObject.name === 'callout')
        ?.fields,
    ).toEqual([])
  })
})
