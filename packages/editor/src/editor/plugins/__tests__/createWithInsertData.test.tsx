import {describe, expect, it} from '@jest/globals'
import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import {type Descendant} from 'slate'

import {exportedForTesting} from '../createWithInsertData'

const initialValue = [
  {
    _key: 'a',
    _type: 'myTestBlockType',
    children: [
      {
        _key: 'a1',
        _type: 'span',
        marks: ['link1'],
        text: 'Block A',
      },
      {
        _key: 'a2',
        _type: 'span',
        marks: ['colour1'],
        text: 'Block B',
      },
    ],
    markDefs: [
      {
        _key: 'link1',
        _type: 'link',
        href: 'google.com',
        newTab: false,
      },
      {
        _key: 'colour1',
        _type: 'color',
        color: 'red',
      },
    ],
    style: 'normal',
  },
] satisfies Array<Descendant>

describe('plugin: createWithInsertData _regenerateKeys', () => {
  it('has MarkDefs that are allowed annotations', async () => {
    const {_regenerateKeys} = exportedForTesting
    let keyCursor = 0

    const generatedValue = _regenerateKeys(
      {
        isTextBlock: isPortableTextTextBlock,
        isTextSpan: isPortableTextSpan,
      },
      initialValue,
      () => {
        keyCursor++
        return `k${keyCursor}`
      },
      'span',
      {
        annotations: [
          // eslint-disable-next-line camelcase
          {name: 'color', jsonType: 'object', fields: [], __experimental_search: []},
          // eslint-disable-next-line camelcase
          {name: 'link', jsonType: 'object', fields: [], __experimental_search: []},
        ],
      },
    )

    // the keys are not important here as it's not what we are testing here
    expect(generatedValue).toStrictEqual([
      {
        _key: 'k3',
        _type: 'myTestBlockType',
        children: [
          {_key: 'k4', _type: 'span', marks: ['k1'], text: 'Block A'},
          {
            _key: 'k5',
            _type: 'span',
            marks: ['k2'],
            text: 'Block B',
          },
        ],
        markDefs: [
          {_key: 'k1', _type: 'link', href: 'google.com', newTab: false},
          {_key: 'k2', _type: 'color', color: 'red'},
        ],
        style: 'normal',
      },
    ])
  })

  it('removes MarkDefs when no annotations are allowed', async () => {
    const {_regenerateKeys} = exportedForTesting
    let keyCursor = 0

    const generatedValue = _regenerateKeys(
      {
        isTextBlock: isPortableTextTextBlock,
        isTextSpan: isPortableTextSpan,
      },
      initialValue,
      () => {
        keyCursor++
        return `k${keyCursor}`
      },
      'span',
      {annotations: []},
    )

    // orphaned children marks are removed later in the normalize function
    expect(generatedValue).toStrictEqual([
      {
        _key: 'k1',
        _type: 'myTestBlockType',
        children: [
          {_key: 'a1', _type: 'span', marks: ['link1'], text: 'Block A'},
          {
            _key: 'a2',
            _type: 'span',
            marks: ['colour1'],
            text: 'Block B',
          },
        ],
        style: 'normal',
      },
    ])
  })

  it('updates MarkDefs when one annotations is allowed but one is not allowed', async () => {
    const {_regenerateKeys} = exportedForTesting
    let keyCursor = 0

    const generatedValue = _regenerateKeys(
      {
        isTextBlock: isPortableTextTextBlock,
        isTextSpan: isPortableTextSpan,
      },
      initialValue,
      () => {
        keyCursor++
        return `k${keyCursor}`
      },
      'span',
      // eslint-disable-next-line camelcase
      {annotations: [{name: 'color', jsonType: 'object', fields: [], __experimental_search: []}]},
    )

    // orphaned children marks are removed later in the normalize function
    expect(generatedValue).toStrictEqual([
      {
        _key: 'k1',
        _type: 'myTestBlockType',
        children: [
          {_key: 'a1', _type: 'span', marks: ['link1'], text: 'Block A'},
          {
            _key: 'a2',
            _type: 'span',
            marks: ['colour1'],
            text: 'Block B',
          },
        ],
        markDefs: [{_key: 'colour1', _type: 'color', color: 'red'}],
        style: 'normal',
      },
    ])
  })
})
