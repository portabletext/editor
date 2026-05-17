import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Container} from '../renderers/renderer.types'
import {resolveContainerField} from '../schema/resolve-containers'
import {getUnionSchema} from './get-union-schema'

const testRender: Container['render'] = ({children}) => children

describe(getUnionSchema.name, () => {
  test('returns the root schema when no containers are registered', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'h1'}],
      }),
    )

    const union = getUnionSchema(schema, new Map())

    expect(union.decorators.map((d) => d.name)).toEqual(['strong'])
    expect(union.styles.map((s) => s.name)).toEqual(['normal', 'h1'])
  })

  test('merges container sub-schema members with root, deduped by name', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'h1'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'em'}, {name: 'strong'}],
                    styles: [{name: 'callout-body'}],
                  },
                ],
              },
            ],
          },
          {
            name: 'code-block',
            fields: [
              {
                name: 'lines',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'code'}],
                    styles: [{name: 'monospace'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const containers = new Map()
    for (const container of [
      {
        kind: 'container',
        type: 'callout',
        arrayField: 'content',
        render: testRender,
      },
      {
        kind: 'container',
        type: 'code-block',
        arrayField: 'lines',
        render: testRender,
      },
    ] satisfies ReadonlyArray<Container>) {
      const field = resolveContainerField(
        schema,
        container.type,
        container.arrayField,
      )
      if (!field) {
        throw new Error(
          `field "${container.arrayField}" not found on type "${container.type}"`,
        )
      }
      containers.set(container.type, {container, field})
    }

    const union = getUnionSchema(schema, containers)

    // 'strong' from root, 'em' from callout, 'code' from code-block
    expect(union.decorators.map((d) => d.name)).toEqual([
      'strong',
      'em',
      'code',
    ])
    // 'normal' synthesized at root, 'h1' root, 'callout-body' callout, 'monospace' code-block
    expect(union.styles.map((s) => s.name)).toEqual([
      'normal',
      'h1',
      'callout-body',
      'monospace',
    ])
  })

  test('does not include sub-schema for unregistered containers', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    // No container registered for 'callout' - just an empty containers map.
    const union = getUnionSchema(schema, new Map())

    // 'em' must NOT appear because the callout is not a registered container.
    expect(union.decorators.map((d) => d.name)).toEqual(['strong'])
  })

  test('excludes structural containers whose field does not accept text blocks', () => {
    // A table whose 'rows' field accepts only 'row' objects, whose 'cells'
    // field accepts only 'cell' objects, and whose 'content' field finally
    // accepts text blocks.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'table',
            fields: [
              {
                name: 'rows',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
                            name: 'cell',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [
                                  {
                                    type: 'block',
                                    decorators: [{name: 'code'}],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
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

    const containers = new Map()
    for (const container of [
      {
        kind: 'container',
        type: 'table',
        arrayField: 'rows',
        render: testRender,
      },
      {kind: 'container', type: 'row', arrayField: 'cells', render: testRender},
      {
        kind: 'container',
        type: 'cell',
        arrayField: 'content',
        render: testRender,
      },
    ] satisfies ReadonlyArray<Container>) {
      const field = resolveContainerField(
        schema,
        container.type,
        container.arrayField,
      )
      if (!field) {
        throw new Error(
          `field "${container.arrayField}" not found on type "${container.type}"`,
        )
      }
      containers.set(container.type, {container, field})
    }

    const union = getUnionSchema(schema, containers)

    // 'row' and 'cell' must NOT appear in the union: their containers
    // (`table` accepting 'row' only, `row` accepting 'cell' only) do not
    // accept text blocks. Only 'table' (declared at root) and the members
    // reached through `cell` (which accepts text blocks) appear.
    expect(union.blockObjects.map((b) => b.name)).toEqual(['table'])
    // The cell's content sub-schema contributes the 'code' decorator.
    expect(union.decorators.map((d) => d.name)).toEqual(['code'])
  })
})
