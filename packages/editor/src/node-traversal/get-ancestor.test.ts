import {isTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getAncestor} from './get-ancestor'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getAncestor.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getAncestor(testbed.context, [], () => true)).toBeUndefined()
  })

  test('top-level block returns undefined', () => {
    expect(
      getAncestor(testbed.context, [{_key: 'k3'}], () => true),
    ).toBeUndefined()
  })

  test('find text block ancestor of span', () => {
    const entry = getAncestor(
      testbed.context,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      (node) => isTextBlock({schema: testbed.schema}, node),
    )
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('find text block ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) => isTextBlock({schema: testbed.schema}, node),
    )
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
  })

  test('find cell ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) => node._type === 'cell',
    )
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
  })

  test('find row ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) => node._type === 'row',
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('find table ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) => node._type === 'table',
    )
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([{_key: 'k26'}])
  })

  test('no matching ancestor returns undefined', () => {
    expect(
      getAncestor(
        testbed.context,
        [{_key: 'k3'}, 'children', {_key: 'k0'}],
        (node) => node._type === 'table',
      ),
    ).toBeUndefined()
  })

  test('match receives path', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (_node: Node, path: Path) =>
        path.filter(
          (segment) =>
            typeof segment === 'object' || typeof segment === 'number',
        ).length === 2,
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('does not check the node itself', () => {
    expect(
      getAncestor(
        testbed.context,
        [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
          'children',
          {_key: 'k12'},
        ],
        (node) => node._type === 'span',
      ),
    ).toBeUndefined()
  })

  test('find code block ancestor of code span', () => {
    const entry = getAncestor(
      testbed.context,
      [{_key: 'k11'}, 'code', {_key: 'k8'}, 'children', {_key: 'k7'}],
      (node) => node._type === 'code-block',
    )
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([{_key: 'k11'}])
  })

  test('returns nearest matching ancestor', () => {
    const entry = getAncestor(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) =>
        isTextBlock({schema: testbed.schema}, node) || node._type === 'table',
    )
    // Should return cellBlock1 (nearest), not table (furthest)
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
  })
})
