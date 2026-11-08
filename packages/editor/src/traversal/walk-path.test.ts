import {compileSchema, type PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {resolveTestbedContainers} from './node-traversal-testbed'
import {walkPath} from './walk-path'

const schema = compileSchema(textBlockDepthsSchemaDefinition)
const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)
const calloutContainer = containers.get('callout')
const noteContainer = containers.get('note')

function snapshotOf(value: Array<PortableTextBlock>) {
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})

  return {context: {schema, containers, value}, blockIndexMap}
}

describe('walkPath at the root', () => {
  test('a full span path is found with every node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: block,
        path: [{_key: 'b0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: fooSpan,
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [fooSpan, barSpan],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a full block path is found with the block as the last node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [{_key: 'b0'}])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: block,
        path: [{_key: 'b0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('an indexed span path is found at the keyed path', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [0, 'children', 0])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: block,
        path: [{_key: 'b0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: fooSpan,
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [fooSpan, barSpan],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a mark definition path is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['markDefs', {_key: 'l0'}])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([{node: block, path: [{_key: 'b0'}], segmentIndex: 0, index: 0}])
  })

  test('a data path inside a span is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      'marks',
      0,
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['marks', 0])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: block, path: [{_key: 'b0'}], segmentIndex: 0, index: 0},
      {
        node: fooSpan,
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a missing span key is missing at the span segment, with the spans searched', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'children',
      {_key: 'missing-span'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(2)
    expect(walk.siblings).toEqual([fooSpan, barSpan])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([{node: block, path: [{_key: 'b0'}], segmentIndex: 0, index: 0}])
  })

  test('a missing block key is missing at the block segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(0)
    expect(walk.siblings).toBe(value)
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([])
  })

  test('a missing top-level key is missing at the first segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-top-level'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(0)
    expect(walk.siblings).toBe(value)
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([])
  })

  test('a compact span path (keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [{_key: 'b0'}, {_key: 's0'}])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [0, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [{_key: 'b0'}, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed then keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [0, {_key: 's0'}])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing key then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [{_key: 'missing-block'}, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'children',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container after a missing text block) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'children',
      {_key: 'missing-container'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'children',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (keyed, with a compact block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      {_key: 's0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (numeric suffix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after a missing key is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
      {_key: 'other'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after the found node is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      0,
      1,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a leading field name is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const value = [block]
    const walk = walkPath(snapshotOf(value), [
      'children',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a middle block is found at its index', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const blocks = [b0, b1, b2]
    const walk = walkPath(snapshotOf(blocks), [{_key: 'b1'}])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: b1,
        path: [{_key: 'b1'}],
        segmentIndex: 0,
        index: 1,
        siblings: blocks,
        container: undefined,
        children: {
          children: b1.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('the last block is found at its index', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const blocks = [b0, b1, b2]
    const walk = walkPath(snapshotOf(blocks), [{_key: 'b2'}])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: b2,
        path: [{_key: 'b2'}],
        segmentIndex: 0,
        index: 2,
        siblings: blocks,
        container: undefined,
        children: {
          children: b2.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('the last span is found at its index', () => {
    const s0 = {_key: 's0', _type: 'span', text: 'a'}
    const s1 = {_key: 's1', _type: 'span', text: 'b'}
    const s2 = {_key: 's2', _type: 'span', text: 'c'}
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [s0, s1, s2],
      markDefs: [],
    }
    const blocks = [b0]
    const walk = walkPath(snapshotOf(blocks), [
      {_key: 'b0'},
      'children',
      {_key: 's2'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: b0,
        path: [{_key: 'b0'}],
        segmentIndex: 0,
        index: 0,
        siblings: blocks,
        container: undefined,
        children: {
          children: [s0, s1, s2],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: s2,
        path: [{_key: 'b0'}, 'children', {_key: 's2'}],
        segmentIndex: 2,
        index: 2,
        siblings: [s0, s1, s2],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a block index past the end is missing', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const blocks = [b0, b1, b2]
    const walk = walkPath(snapshotOf(blocks), [3])

    expect(walk).toEqual({
      status: 'missing',
      nodes: [],
      siblings: blocks,
      segmentIndex: 0,
    })
  })

  test('a span index past the end is missing with the block walked', () => {
    const s0 = {_key: 's0', _type: 'span', text: 'a'}
    const s1 = {_key: 's1', _type: 'span', text: 'b'}
    const s2 = {_key: 's2', _type: 'span', text: 'c'}
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [s0, s1, s2],
      markDefs: [],
    }
    const blocks = [b0]
    const walk = walkPath(snapshotOf(blocks), [0, 'children', 3])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(2)
    expect(walk.siblings).toEqual([s0, s1, s2])
    expect(walk.nodes.map((n) => n.node)).toEqual([b0])
  })

  test('negative indexes count from the end', () => {
    const s0 = {_key: 's0', _type: 'span', text: 'a'}
    const s1 = {_key: 's1', _type: 'span', text: 'b'}
    const s2 = {_key: 's2', _type: 'span', text: 'c'}
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [s0, s1, s2],
      markDefs: [],
    }
    const blocks = [b0]
    const walk = walkPath(snapshotOf(blocks), [-1, 'children', -1])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: b0,
        path: [{_key: 'b0'}],
        segmentIndex: 0,
        index: 0,
        siblings: blocks,
        container: undefined,
        children: {
          children: [s0, s1, s2],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: s2,
        path: [{_key: 'b0'}, 'children', {_key: 's2'}],
        segmentIndex: 2,
        index: 2,
        siblings: [s0, s1, s2],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a block index map entry pointing at the wrong index falls back to a scan', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const blocks = [b0, b1, b2]
    const snapshot = snapshotOf(blocks)
    snapshot.blockIndexMap.set('[_key=="b2"]', 0)
    const walk = walkPath(snapshot, [{_key: 'b2'}])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: b2,
        path: [{_key: 'b2'}],
        segmentIndex: 0,
        index: 2,
        siblings: blocks,
        container: undefined,
        children: {
          children: b2.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })
})

describe('walkPath inside a callout', () => {
  test('a full span path is found with every node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: callout,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [block],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [block],
        container: calloutContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: fooSpan,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
        siblings: [fooSpan, barSpan],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a full block path is found with the block as the last node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: callout,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [block],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [block],
        container: calloutContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('an indexed span path is found at the keyed path', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [0, 'content', 0, 'children', 0])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: callout, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: fooSpan,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a mark definition path is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['markDefs', {_key: 'l0'}])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: callout, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a data path inside a span is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      'marks',
      0,
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['marks', 0])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: callout, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: fooSpan,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a missing span key is missing at the span segment, with the spans searched', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 'missing-span'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(4)
    expect(walk.siblings).toEqual([fooSpan, barSpan])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: callout, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a missing block key is missing at the block segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(2)
    expect(walk.siblings).toEqual([block])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: callout, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
    ])
  })

  test('a missing top-level key is missing at the first segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-top-level'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(0)
    expect(walk.siblings).toBe(value)
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([])
  })

  test('a compact span path (keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [0, 'content', 0, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed then keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [0, 'content', 0, {_key: 's0'}])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing key then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'missing-block'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container after a missing text block) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 'missing-container'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (keyed, with a compact block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      {_key: 's0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (numeric suffix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after a missing key is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
      {_key: 'other'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after the found node is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      0,
      1,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a leading field name is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      'children',
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed, missing only the container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]

    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed, missing only the container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [block]}
    const value = [callout]

    const walk = walkPath(snapshotOf(value), [0, 0, 'children', 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a middle block is found at its index', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [b0, b1, b2]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'b1'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: callout,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [b0, b1, b2],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: b1,
        path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
        segmentIndex: 2,
        index: 1,
        siblings: [b0, b1, b2],
        container: calloutContainer,
        children: {
          children: b1.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('a negative index counts from the end', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [b0, b1, b2]}
    const value = [callout]
    const walk = walkPath(snapshotOf(value), [0, 'content', -1])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: callout,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [b0, b1, b2],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: b2,
        path: [{_key: 'c0'}, 'content', {_key: 'b2'}],
        segmentIndex: 2,
        index: 2,
        siblings: [b0, b1, b2],
        container: calloutContainer,
        children: {
          children: b2.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('a block index map entry pointing at the wrong index falls back to a scan', () => {
    const b0 = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: 'text 0'}],
      markDefs: [],
    }
    const b1 = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'text 1'}],
      markDefs: [],
    }
    const b2 = {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'text 2'}],
      markDefs: [],
    }
    const callout = {_key: 'c0', _type: 'callout', content: [b0, b1, b2]}
    const value = [callout]
    const snapshot = snapshotOf(value)
    snapshot.blockIndexMap.set('[_key=="c0"].content[_key=="b2"]', 0)
    const walk = walkPath(snapshot, [{_key: 'c0'}, 'content', {_key: 'b2'}])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: callout,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [b0, b1, b2],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: b2,
        path: [{_key: 'c0'}, 'content', {_key: 'b2'}],
        segmentIndex: 2,
        index: 2,
        siblings: [b0, b1, b2],
        container: calloutContainer,
        children: {
          children: b2.children,
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })
})

describe('walkPath inside a callout inside a callout', () => {
  test('a full span path is found with every node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: outer,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [inner],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
        siblings: [inner],
        container: calloutContainer,
        children: {
          children: [block],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
        siblings: [block],
        container: calloutContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: fooSpan,
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        segmentIndex: 6,
        index: 0,
        siblings: [fooSpan, barSpan],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a full block path is found with the block as the last node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: outer,
        path: [{_key: 'c0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [inner],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
        siblings: [inner],
        container: calloutContainer,
        children: {
          children: [block],
          fieldName: 'content',
          parent: calloutContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
        siblings: [block],
        container: calloutContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('an indexed span path is found at the keyed path', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      0,
      'content',
      0,
      'content',
      0,
      'children',
      0,
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: outer, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
      },
      {
        node: fooSpan,
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        segmentIndex: 6,
        index: 0,
      },
    ])
  })

  test('a mark definition path is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['markDefs', {_key: 'l0'}])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: outer, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a data path inside a span is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      'marks',
      0,
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['marks', 0])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: outer, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
      },
      {
        node: fooSpan,
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
        ],
        segmentIndex: 6,
        index: 0,
      },
    ])
  })

  test('a missing span key is missing at the span segment, with the spans searched', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 'missing-span'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(6)
    expect(walk.siblings).toEqual([fooSpan, barSpan])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: outer, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: block,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a missing block key is missing at the block segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(4)
    expect(walk.siblings).toEqual([block])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: outer, path: [{_key: 'c0'}], segmentIndex: 0, index: 0},
      {
        node: inner,
        path: [{_key: 'c0'}, 'content', {_key: 'c1'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a missing top-level key is missing at the first segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-top-level'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(0)
    expect(walk.siblings).toBe(value)
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([])
  })

  test('a compact span path (keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [0, 'content', 0, 'content', 0, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed then keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      0,
      'content',
      0,
      'content',
      0,
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing key then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'missing-block'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container after a missing text block) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 'missing-container'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (keyed, with a compact block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      {_key: 's0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (numeric suffix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after a missing key is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
      {_key: 'other'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after the found node is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      0,
      1,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a leading field name is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]
    const walk = walkPath(snapshotOf(value), [
      'children',
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed, missing only the outer container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]

    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      {_key: 'c1'},
      'content',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed, missing only the outer container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]

    const walk = walkPath(snapshotOf(value), [
      0,
      0,
      'content',
      0,
      'children',
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed, missing only the inner container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]

    const walk = walkPath(snapshotOf(value), [
      {_key: 'c0'},
      'content',
      {_key: 'c1'},
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed, missing only the inner container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const inner = {_key: 'c1', _type: 'callout', content: [block]}
    const outer = {_key: 'c0', _type: 'callout', content: [inner]}
    const value = [outer]

    const walk = walkPath(snapshotOf(value), [
      0,
      'content',
      0,
      0,
      'children',
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })
})

describe('walkPath inside a field with its own sub-schema', () => {
  test('a full span path is found with every node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: note,
        path: [{_key: 'n0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [block],
          fieldName: 'body',
          parent: noteContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [block],
        container: noteContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
      {
        node: fooSpan,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
        siblings: [fooSpan, barSpan],
        container: undefined,
        children: undefined,
      },
    ])
  })

  test('a full block path is found with the block as the last node', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
        siblings: n.siblings,
        container: n.container,
        children: n.children,
      })),
    ).toEqual([
      {
        node: note,
        path: [{_key: 'n0'}],
        segmentIndex: 0,
        index: 0,
        siblings: value,
        container: undefined,
        children: {
          children: [block],
          fieldName: 'body',
          parent: noteContainer,
        },
      },
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
        siblings: [block],
        container: noteContainer,
        children: {
          children: [fooSpan, barSpan],
          fieldName: 'children',
          parent: undefined,
        },
      },
    ])
  })

  test('an indexed span path is found at the keyed path', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [0, 'body', 0, 'children', 0])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual([])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: note, path: [{_key: 'n0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: fooSpan,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a mark definition path is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['markDefs', {_key: 'l0'}])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: note, path: [{_key: 'n0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a data path inside a span is found with the data path as the rest', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      'marks',
      0,
    ])

    expect(walk.status).toEqual('found')
    if (walk.status !== 'found') {
      return
    }
    expect(walk.rest).toEqual(['marks', 0])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: note, path: [{_key: 'n0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
      {
        node: fooSpan,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
        segmentIndex: 4,
        index: 0,
      },
    ])
  })

  test('a missing span key is missing at the span segment, with the spans searched', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 'missing-span'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(4)
    expect(walk.siblings).toEqual([fooSpan, barSpan])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([
      {node: note, path: [{_key: 'n0'}], segmentIndex: 0, index: 0},
      {
        node: block,
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
        segmentIndex: 2,
        index: 0,
      },
    ])
  })

  test('a missing block key is missing at the block segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(2)
    expect(walk.siblings).toEqual([block])
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([{node: note, path: [{_key: 'n0'}], segmentIndex: 0, index: 0}])
  })

  test('a missing top-level key is missing at the first segment', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-top-level'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk.status).toEqual('missing')
    if (walk.status !== 'missing') {
      return
    }
    expect(walk.segmentIndex).toEqual(0)
    expect(walk.siblings).toBe(value)
    expect(
      walk.nodes.map((n) => ({
        node: n.node,
        path: n.path,
        segmentIndex: n.segmentIndex,
        index: n.index,
      })),
    ).toEqual([])
  })

  test('a compact span path (keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [0, 'body', 0, 0])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed then keyed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [0, 'body', 0, {_key: 's0'}])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing key then indexed) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'missing-block'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'missing-block'},
      'children',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container after a missing text block) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'missing-block'},
      'children',
      {_key: 'missing-container'},
      'content',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (missing container prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'missing-block'},
      'body',
      {_key: 'b0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (keyed, with a compact block prefix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      {_key: 's0'},
      'markDefs',
      {_key: 'l0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact annotation path (numeric suffix) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'markDefs',
      {_key: 'l0'},
      0,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after a missing key is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'missing-block'},
      'children',
      {_key: 's0'},
      {_key: 'other'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact pair after the found node is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
      0,
      1,
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a leading field name is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]
    const walk = walkPath(snapshotOf(value), [
      'children',
      {_key: 'n0'},
      'body',
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (keyed, missing only the container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]

    const walk = walkPath(snapshotOf(value), [
      {_key: 'n0'},
      {_key: 'b0'},
      'children',
      {_key: 's0'},
    ])

    expect(walk).toEqual({status: 'invalid'})
  })

  test('a compact span path (indexed, missing only the container field) is invalid', () => {
    const fooSpan = {_key: 's0', _type: 'span', text: 'foo'}
    const barSpan = {_key: 's1', _type: 'span', text: 'bar'}
    const link = {_key: 'l0', _type: 'link', href: 'https://a'}
    const block = {
      _key: 'b0',
      _type: 'block',
      children: [fooSpan, barSpan],
      markDefs: [link],
    }
    const note = {_key: 'n0', _type: 'note', body: [block]}
    const value = [note]

    const walk = walkPath(snapshotOf(value), [0, 0, 'children', 0])

    expect(walk).toEqual({status: 'invalid'})
  })
})
