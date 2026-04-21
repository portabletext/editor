import type {ReactElement} from 'react'
import {describe, expect, test} from 'vitest'
import {parseScope} from '../scope/parse-scope'
import {findMatchingLeaf} from './find-matching-leaf'
import type {Leaf, LeafConfig} from './renderer.types'

function leaf(scope: string, marker: string): LeafConfig {
  const parsedScope = parseScope(scope)
  if (!parsedScope) {
    throw new Error(`invalid scope: ${scope}`)
  }
  const l: Leaf = {
    scope,
    render: () => marker as unknown as ReactElement,
  }
  return {leaf: l, parsedScope}
}

function leafs(...entries: Array<LeafConfig>): Map<string, LeafConfig> {
  const map = new Map<string, LeafConfig>()
  for (const entry of entries) {
    map.set(entry.leaf.scope, entry)
  }
  return map
}

describe(findMatchingLeaf.name, () => {
  test('returns undefined when no leaf matches', () => {
    expect(
      findMatchingLeaf(leafs(leaf('$..image', 'image')), ['block', 'span']),
    ).toBeUndefined()
  })

  test('picks the only match when one leaf matches', () => {
    const match = leaf('$..block.span', 'span-override')
    expect(findMatchingLeaf(leafs(match), ['block', 'span'])).toBe(match)
  })

  test('picks the most specific when multiple match', () => {
    const broad = leaf('$..block.span', 'broad')
    const specific = leaf('$..callout.block.span', 'specific')
    expect(
      findMatchingLeaf(leafs(broad, specific), ['callout', 'block', 'span']),
    ).toBe(specific)
  })

  test('last registration wins when two scopes are equally specific', () => {
    const first = leaf('$..callout.block.span', 'first')
    const second = leaf('$..callout.block.span', 'second')
    const map = new Map<string, LeafConfig>()
    map.set('first', first)
    map.set('second', second)
    expect(findMatchingLeaf(map, ['callout', 'block', 'span'])).toBe(second)
  })
})
