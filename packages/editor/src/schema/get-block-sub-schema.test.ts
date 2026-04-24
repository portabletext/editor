import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {getBlockSubSchema} from './get-block-sub-schema'
import {makeContainerConfig} from './make-container-config'
import {resolveContainers} from './resolve-containers'

const testRender: ContainerDefinition['render'] = ({children}) => children

describe(getBlockSubSchema.name, () => {
  test('returns root sub-schema when path is at root', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        annotations: [{name: 'link'}],
        styles: [{name: 'h1'}],
      }),
    )

    const context = {
      schema,
      containers: new Map(),
      value: [{_type: 'block', _key: 'b0', children: []}],
    }

    const subSchema = getBlockSubSchema(context, [{_key: 'b0'}])

    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong', 'em'])
    expect(subSchema.styles.map((s) => s.name)).toEqual(['normal', 'h1'])
    expect(subSchema.annotations.map((a) => a.name)).toEqual(['link'])
  })

  test('returns nested sub-schema inside a registered container', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        styles: [{name: 'h1'}],
        blockObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'strong'}],
                    styles: [{name: 'monospace'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const containerConfigs: Map<string, ContainerConfig> = new Map()
    containerConfigs.set(
      '$..cell',
      makeContainerConfig(schema, {
        scope: '$..cell',
        field: 'content',
        render: testRender,
      }),
    )
    const containers = resolveContainers(schema, containerConfigs)

    const value = [
      {
        _type: 'cell',
        _key: 'c0',
        content: [{_type: 'block', _key: 'b0', children: []}],
      },
    ]
    const context = {schema, containers, value}

    const subSchema = getBlockSubSchema(context, [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])

    // Verify-by-breaking: if the helper fell back to root, decorators would be ['strong', 'em'].
    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong'])
    expect(subSchema.styles.map((s) => s.name)).toEqual(['monospace'])
  })

  test('inherits root fields when nested block does not override', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        annotations: [{name: 'link'}],
        inlineObjects: [{name: 'mention'}],
        blockObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}],
              },
            ],
          },
        ],
      }),
    )

    const containerConfigs: Map<string, ContainerConfig> = new Map()
    containerConfigs.set(
      '$..cell',
      makeContainerConfig(schema, {
        scope: '$..cell',
        field: 'content',
        render: testRender,
      }),
    )
    const containers = resolveContainers(schema, containerConfigs)

    const value = [
      {
        _type: 'cell',
        _key: 'c0',
        content: [{_type: 'block', _key: 'b0', children: []}],
      },
    ]
    const context = {schema, containers, value}

    const subSchema = getBlockSubSchema(context, [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])

    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong'])
    expect(subSchema.annotations.map((a) => a.name)).toEqual(['link'])
    expect(subSchema.inlineObjects.map((i) => i.name)).toEqual(['mention'])
  })

  test('walks multiple ancestor levels to find the enclosing container', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        blockObjects: [
          {
            name: 'table',
            fields: [
              {
                name: 'rows',
                type: 'array',
                of: [
                  {
                    type: 'row',
                    name: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'cell',
                            name: 'cell',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [
                                  {
                                    type: 'block',
                                    decorators: [{name: 'strong'}],
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

    const containerConfigs: Map<string, ContainerConfig> = new Map()
    containerConfigs.set(
      '$..table',
      makeContainerConfig(schema, {
        scope: '$..table',
        field: 'rows',
        render: testRender,
      }),
    )
    containerConfigs.set(
      '$..row',
      makeContainerConfig(schema, {
        scope: '$..row',
        field: 'cells',
        render: testRender,
      }),
    )
    containerConfigs.set(
      '$..cell',
      makeContainerConfig(schema, {
        scope: '$..cell',
        field: 'content',
        render: testRender,
      }),
    )
    const containers = resolveContainers(schema, containerConfigs)

    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [{_type: 'block', _key: 'b0', children: []}],
              },
            ],
          },
        ],
      },
    ]
    const context = {schema, containers, value}

    const subSchema = getBlockSubSchema(context, [
      {_key: 't0'},
      'rows',
      {_key: 'r0'},
      'cells',
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])

    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong'])
  })
})
