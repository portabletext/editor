import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {makeContainerConfig} from '../schema/make-container-config'
import {resolveContainers} from '../schema/resolve-containers'
import type {EditorSelectionPoint} from '../types/editor'
import {getAvailableDecorators} from './selector.get-available-decorators'
import {getAvailableLists} from './selector.get-available-lists'
import {isAvailableDecorator} from './selector.is-available-decorator'
import {isAvailableList} from './selector.is-available-list'

const testRender: ContainerDefinition['render'] = ({children}) => children

const rootSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', type: 'object', fields: []}],
  styles: [{name: 'h1'}],
  lists: [{name: 'bullet'}],
  blockObjects: [
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
              annotations: [],
              styles: [{name: 'code'}],
              lists: [],
            },
          ],
        },
      ],
    },
  ],
})

const schema = compileSchema(rootSchemaDefinition)
const containerConfigs: Map<string, ContainerConfig> = new Map()
containerConfigs.set(
  '$..code-block',
  makeContainerConfig(schema, {
    scope: '$..code-block',
    field: 'lines',
    render: testRender,
  }),
)
const containers = resolveContainers(schema, containerConfigs)

const rootSpanFocus: EditorSelectionPoint = {
  path: [{_key: 'b0'}, 'children', {_key: 's0'}],
  offset: 0,
}
const rootValue = [
  {
    _type: 'block',
    _key: 'b0',
    children: [{_type: 'span', _key: 's0', text: '', marks: []}],
    markDefs: [],
    style: 'normal',
  },
]

const containerSpanFocus: EditorSelectionPoint = {
  path: [{_key: 'cb0'}, 'lines', {_key: 'b0'}, 'children', {_key: 's0'}],
  offset: 0,
}
const containerValue = [
  {
    _type: 'code-block',
    _key: 'cb0',
    lines: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        markDefs: [],
        style: 'code',
      },
    ],
  },
]

function snapshotAt(
  value: typeof rootValue | typeof containerValue,
  focus: EditorSelectionPoint,
) {
  return createTestSnapshot({
    context: {
      schema,
      containers,
      value,
      selection: {
        anchor: focus,
        focus,
      },
    },
  })
}

describe(getAvailableDecorators.name, () => {
  test('returns root decorators when focus is in a root text block', () => {
    expect(
      getAvailableDecorators(snapshotAt(rootValue, rootSpanFocus)),
    ).toEqual(['strong', 'em'])
  })

  test('returns container-scoped decorators when focus is inside a container', () => {
    expect(
      getAvailableDecorators(snapshotAt(containerValue, containerSpanFocus)),
    ).toEqual(['code'])
  })
})

describe(getAvailableLists.name, () => {
  test('returns root lists when focus is in a root text block', () => {
    expect(getAvailableLists(snapshotAt(rootValue, rootSpanFocus))).toEqual([
      'bullet',
    ])
  })

  test('returns container-scoped lists when focus is inside a container', () => {
    expect(
      getAvailableLists(snapshotAt(containerValue, containerSpanFocus)),
    ).toEqual([])
  })
})

describe(isAvailableDecorator.name, () => {
  test('returns true for a decorator in the current sub-schema', () => {
    expect(
      isAvailableDecorator('code')(
        snapshotAt(containerValue, containerSpanFocus),
      ),
    ).toBe(true)
  })

  test('returns false for a decorator not in the current sub-schema', () => {
    expect(
      isAvailableDecorator('strong')(
        snapshotAt(containerValue, containerSpanFocus),
      ),
    ).toBe(false)
  })
})

describe(isAvailableList.name, () => {
  test('returns true for a list in the current sub-schema', () => {
    expect(
      isAvailableList('bullet')(snapshotAt(rootValue, rootSpanFocus)),
    ).toBe(true)
  })

  test('returns false for a list not in the current sub-schema', () => {
    expect(
      isAvailableList('bullet')(snapshotAt(containerValue, containerSpanFocus)),
    ).toBe(false)
  })
})
