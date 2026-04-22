import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {makeContainerConfig} from '../schema/make-container-config'
import {resolveContainers} from '../schema/resolve-containers'
import {getDefaultStyle} from './selector.get-default-style'

const testRender: ContainerDefinition['render'] = ({children}) => children

describe(getDefaultStyle.name, () => {
  test(`returns the root schema's first style when focus is at a root text block`, () => {
    const schema = compileSchema(
      defineSchema({
        styles: [{name: 'h1'}],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        value: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: '', marks: []}],
            markDefs: [],
          },
        ],
        selection: {
          anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
        },
      },
    })

    expect(getDefaultStyle(snapshot)).toBe('normal')
  })

  test(`returns the container override's first style when focus is inside a container`, () => {
    const schema = compileSchema(
      defineSchema({
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

    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers,
        value: [
          {
            _type: 'cell',
            _key: 'c0',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: '', marks: []}],
                markDefs: [],
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 0,
          },
        },
      },
    })

    expect(getDefaultStyle(snapshot)).toBe('monospace')
  })

  test(`falls back to the root schema when there is no focus text block`, () => {
    const schema = compileSchema(
      defineSchema({
        styles: [{name: 'h1'}],
        blockObjects: [{name: 'image'}],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        value: [{_type: 'image', _key: 'i0'}],
        selection: {
          anchor: {path: [{_key: 'i0'}], offset: 0},
          focus: {path: [{_key: 'i0'}], offset: 0},
        },
      },
    })

    expect(getDefaultStyle(snapshot)).toBe('normal')
  })

  test(`returns undefined when no styles are declared`, () => {
    const schema = compileSchema(
      defineSchema({
        styles: [],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema: {...schema, styles: []},
        value: [],
        selection: null,
      },
    })

    expect(getDefaultStyle(snapshot)).toBeUndefined()
  })
})
