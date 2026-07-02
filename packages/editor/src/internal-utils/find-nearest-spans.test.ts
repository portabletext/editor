import {compileSchema, defineSchema, isSpan} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Path} from '../engine/interfaces/path'
import {comparePaths} from '../engine/path/compare-paths'
import {pathEquals} from '../engine/path/path-equals'
import {serializePath} from '../paths/serialize-path'
import {getNodes} from '../traversal/get-nodes'
import {createNodeTraversalTestbed} from '../traversal/node-traversal-testbed'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {buildIndexMaps} from './build-index-maps'
import {findNearestSpans, type SpanEntry} from './find-nearest-spans'

describe(findNearestSpans.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('Scenario: Equals the document scan for every node path in the testbed', () => {
    for (const {path} of getNodes(testbed.snapshot)) {
      expect(
        findNearestSpans(testbed.snapshot, path),
        `path ${serializePath(path)}`,
      ).toEqual(referenceNearestSpans(testbed.snapshot, path))
    }
  })

  test('Scenario: Removing a block object between text blocks', () => {
    // `image` sits between `textBlock1` (ending in `span2`) and
    // `textBlock2` (starting with `span3`).
    expect(
      findNearestSpans(testbed.snapshot, [{_key: testbed.image._key}]),
    ).toEqual({
      previousSpan: {
        node: testbed.span2,
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span2._key},
        ],
      },
      nextSpan: {
        node: testbed.span3,
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
      },
    })
  })

  test('Scenario: Removing the first block yields its own descendant as next', () => {
    // Descendants of the removed node come after it in document order,
    // matching the document scan the fallback used before.
    expect(
      findNearestSpans(testbed.snapshot, [{_key: testbed.textBlock1._key}]),
    ).toEqual({
      previousSpan: undefined,
      nextSpan: {
        node: testbed.span1,
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
      },
    })
  })

  test('Scenario: Removing a nested cell block reaches across container boundaries', () => {
    // `cellBlock3` lives in `cell2`; the previous span is in `cell1`'s
    // last block, the next span is `cellBlock3`'s own descendant.
    expect(
      findNearestSpans(testbed.snapshot, [
        {_key: testbed.table._key},
        'rows',
        {_key: testbed.row1._key},
        'cells',
        {_key: testbed.cell2._key},
        'content',
        {_key: testbed.cellBlock3._key},
      ]),
    ).toEqual({
      previousSpan: {
        node: testbed.cellSpan2,
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock2._key},
          'children',
          {_key: testbed.cellSpan2._key},
        ],
      },
      nextSpan: {
        node: testbed.cellSpan3,
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell2._key},
          'content',
          {_key: testbed.cellBlock3._key},
          'children',
          {_key: testbed.cellSpan3._key},
        ],
      },
    })
  })

  test('Scenario: Numeric root path', () => {
    // `unset` op paths may address root children by index. The
    // document scan this replaced degenerated here (`comparePaths`
    // can't order keyed paths against a numeric segment, so every span
    // compared as "after" and the first span in the document won);
    // `findNearestSpans` resolves the true document-order neighbors.
    expect(findNearestSpans(testbed.snapshot, [1])).toEqual({
      previousSpan: {
        node: testbed.span2,
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span2._key},
        ],
      },
      nextSpan: {
        node: testbed.span3,
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
      },
    })
  })

  test('Scenario: Only block objects between the removed node and the nearest spans', () => {
    // The walk hops over span-less siblings in both directions until it
    // reaches a subtree that holds a span.
    const snapshot = createObjectRunSnapshot()

    expect(findNearestSpans(snapshot, [{_key: 'image2'}])).toEqual(
      referenceNearestSpans(snapshot, [{_key: 'image2'}]),
    )
    expect(findNearestSpans(snapshot, [{_key: 'image2'}])).toEqual({
      previousSpan: {
        node: {_key: 'span1', _type: 'span', text: 'before', marks: []},
        path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
      },
      nextSpan: {
        node: {_key: 'span2', _type: 'span', text: 'after', marks: []},
        path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
      },
    })
  })

  test('Scenario: Document without spans', () => {
    const snapshot = createSpanlessSnapshot()

    expect(findNearestSpans(snapshot, [{_key: 'image2'}])).toEqual({
      previousSpan: undefined,
      nextSpan: undefined,
    })
  })
})

/**
 * Keep-in-sync: the document-scan implementation that
 * `findNearestSpans` replaced in `applyOperation`'s `unset` case,
 * kept as the oracle.
 */
function referenceNearestSpans(
  snapshot: TraversalSnapshot,
  path: Path,
): {
  previousSpan: SpanEntry | undefined
  nextSpan: SpanEntry | undefined
} {
  let previousSpan: SpanEntry | undefined
  let nextSpan: SpanEntry | undefined

  for (const {node, path: nodePath} of getNodes(snapshot)) {
    if (!isSpan({schema: snapshot.context.schema}, node)) {
      continue
    }
    if (pathEquals(nodePath, path)) {
      continue
    }
    if (comparePaths(nodePath, path, snapshot.context) === -1) {
      previousSpan = {node, path: nodePath}
    } else {
      nextSpan = {node, path: nodePath}
      break
    }
  }

  return {previousSpan, nextSpan}
}

function createObjectRunSnapshot(): TraversalSnapshot {
  const schema = compileSchema(defineSchema({blockObjects: [{name: 'image'}]}))
  const value = [
    {
      _key: 'block1',
      _type: 'block',
      children: [{_key: 'span1', _type: 'span', text: 'before', marks: []}],
    },
    {_key: 'image1', _type: 'image'},
    {_key: 'image2', _type: 'image'},
    {_key: 'image3', _type: 'image'},
    {
      _key: 'block2',
      _type: 'block',
      children: [{_key: 'span2', _type: 'span', text: 'after', marks: []}],
    },
  ]
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()
  const containers = new Map()

  buildIndexMaps({schema, value, containers}, {blockIndexMap, listIndexMap})

  return {context: {schema, containers, value}, blockIndexMap}
}

function createSpanlessSnapshot(): TraversalSnapshot {
  const schema = compileSchema(defineSchema({blockObjects: [{name: 'image'}]}))
  const value = [
    {_key: 'image1', _type: 'image'},
    {_key: 'image2', _type: 'image'},
    {_key: 'image3', _type: 'image'},
  ]
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()
  const containers = new Map()

  buildIndexMaps({schema, value, containers}, {blockIndexMap, listIndexMap})

  return {context: {schema, containers, value}, blockIndexMap}
}
