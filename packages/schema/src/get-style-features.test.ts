import {describe, expect, test} from 'vitest'
import {compileSchema} from './compile-schema'
import {getStyleFeatures} from './get-style-features'

describe(getStyleFeatures.name, () => {
  const schema = compileSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    lists: [{name: 'bullet'}, {name: 'number'}],
    inlineObjects: [{name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]}],
    styles: [
      {name: 'normal'},
      {name: 'h1', decorators: [], annotations: [], lists: [], inlineObjects: []},
      {name: 'h2', decorators: [{name: 'em'}]},
    ],
  })

  test('returns top-level features for unrestricted style', () => {
    const features = getStyleFeatures(schema, 'normal')
    expect(features.decorators).toEqual(schema.decorators)
    expect(features.annotations).toEqual(schema.annotations)
    expect(features.lists).toEqual(schema.lists)
    expect(features.inlineObjects).toEqual(schema.inlineObjects)
  })

  test('returns empty arrays for fully restricted style', () => {
    const features = getStyleFeatures(schema, 'h1')
    expect(features.decorators).toEqual([])
    expect(features.annotations).toEqual([])
    expect(features.lists).toEqual([])
    expect(features.inlineObjects).toEqual([])
  })

  test('returns partial restrictions', () => {
    const features = getStyleFeatures(schema, 'h2')
    expect(features.decorators.map((d) => d.name)).toEqual(['em'])
    expect(features.annotations).toEqual(schema.annotations)
    expect(features.lists).toEqual(schema.lists)
    expect(features.inlineObjects).toEqual(schema.inlineObjects)
  })

  test('returns top-level features for unknown style', () => {
    const features = getStyleFeatures(schema, 'unknown')
    expect(features.decorators).toEqual(schema.decorators)
    expect(features.annotations).toEqual(schema.annotations)
  })

  test('returns top-level features for undefined style', () => {
    const features = getStyleFeatures(schema, undefined)
    expect(features.decorators).toEqual(schema.decorators)
    expect(features.annotations).toEqual(schema.annotations)
  })
})
