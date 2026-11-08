import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {resolveContainerByPath} from './resolve-container-by-path'
import {resolveContainersRich} from './resolve-containers'

describe(`${resolveContainerByPath.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveContainersRich(schema, textBlockDepthsContainers)

  test('inside a callout, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const innermostContainer = {
      _type: 'callout',
      _key: 'c0',
      content: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo', marks: []},
            {_type: 'span', _key: 's1', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    }

    expect(
      resolveContainerByPath(
        {schema, value, containers},
        [{_key: 'c0'}, 0],
        innermostContainer,
      ),
    ).toEqual(undefined)
  })

  test('inside a callout inside a callout, a compact container path (indexed) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]
    const innermostContainer = {
      _type: 'callout',
      _key: 'c1',
      content: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo', marks: []},
            {_type: 'span', _key: 's1', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    }

    expect(
      resolveContainerByPath(
        {schema, value, containers},
        [0, 0],
        innermostContainer,
      ),
    ).toEqual(undefined)
  })

  test('inside a field with its own sub-schema, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const innermostContainer = {
      _type: 'note',
      _key: 'n0',
      body: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo', marks: []},
            {_type: 'span', _key: 's1', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    }

    expect(
      resolveContainerByPath(
        {schema, value, containers},
        [{_key: 'n0'}, 0],
        innermostContainer,
      ),
    ).toEqual(undefined)
  })
})
