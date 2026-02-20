import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestKeyGenerator} from '../../test/test-key-generator'
import {flattenNestedBlocks} from './flatten-nested-blocks'

describe(flattenNestedBlocks.name, () => {
  test('flattening text blocks', () => {
    const schema = compileSchema(defineSchema({}))
    expect(
      flattenNestedBlocks({schema}, [
        {
          _type: 'block',
          children: [
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  marks: [],
                  text: 'foo',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]),
    ).toEqual([
      {
        _type: 'block',
        children: [{_type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('flattening text blocks with block objects in schema', () => {
    const schema = compileSchema(
      defineSchema({blockObjects: [{name: 'image'}]}),
    )
    expect(
      flattenNestedBlocks({schema}, [
        {
          _type: 'block',
          children: [
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]),
    ).toEqual([
      {
        _type: 'block',
        children: [{_type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('flattening text blocks with styles in schema', () => {
    const schema = compileSchema(
      defineSchema({
        styles: [{name: 'h1'}],
      }),
    )
    expect(
      flattenNestedBlocks({schema}, [
        {
          _type: 'block',
          children: [
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  marks: [],
                  text: 'foo',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          markDefs: [],
          style: 'h1',
        },
      ]),
    ).toEqual([
      {
        _type: 'block',
        children: [{_type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('splitting text block', () => {
    const keyGenerator = createTestKeyGenerator('k')
    const schema = compileSchema(
      defineSchema({
        styles: [{name: 'h1'}],
        annotations: [{name: 'link'}],
        blockObjects: [{name: 'image'}],
      }),
    )
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const imageKey = keyGenerator()
    const barKey = keyGenerator()
    const linkKey = keyGenerator()

    expect(
      flattenNestedBlocks({schema}, [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: fooKey,
              _type: 'span',
              text: 'foo',
            },
            {
              _key: imageKey,
              _type: 'image',
            },
            {
              _key: barKey,
              _type: 'span',
              text: 'bar',
              marks: [linkKey],
            },
          ],
          style: 'h1',
          markDefs: [
            {
              _key: linkKey,
              _type: 'link',
            },
          ],
        },
      ]),
    ).toEqual([
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: fooKey, _type: 'span', text: 'foo'}],
        style: 'h1',
        markDefs: [{_key: linkKey, _type: 'link'}],
      },
      {
        _key: imageKey,
        _type: 'image',
      },
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: barKey, _type: 'span', text: 'bar', marks: [linkKey]},
        ],
        style: 'h1',
        markDefs: [{_key: linkKey, _type: 'link'}],
      },
    ])
  })

  test('splitting text block with __block', () => {
    const keyGenerator = createTestKeyGenerator('k')
    const schema = compileSchema(
      defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    )
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const imageKey = keyGenerator()
    const barKey = keyGenerator()

    expect(
      flattenNestedBlocks({schema}, [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: fooKey,
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _type: '__block',
              block: {
                _key: imageKey,
                _type: 'image',
              },
            },
            {
              _key: barKey,
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ]),
    ).toEqual([
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: fooKey, _type: 'span', text: 'foo', marks: []}],
        style: 'normal',
        markDefs: [],
      },
      {
        _key: imageKey,
        _type: 'image',
      },
      {
        _key: blockKey,
        _type: 'block',
        children: [{_key: barKey, _type: 'span', text: 'bar', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
  })
})
