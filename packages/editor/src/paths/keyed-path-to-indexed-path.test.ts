import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {keyedPathToIndexedPath} from './keyed-path-to-indexed-path'

describe(keyedPathToIndexedPath.name, () => {
  test('text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      keyedPathToIndexedPath(
        {
          children: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
          ],
        },
        [{_key: blockKey}],
        new Map([[blockKey, 0]]),
      ),
    ).toEqual([0])
  })

  test('text block -> span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      keyedPathToIndexedPath(
        {
          children: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
          ],
        },
        [{_key: blockKey}, 'children', {_key: spanKey}],
        new Map([[blockKey, 0]]),
      ),
    ).toEqual([0, 0])
  })

  test('image', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    expect(
      keyedPathToIndexedPath(
        {children: [{_key: imageKey, _type: 'image'}]},
        [{_key: imageKey}],
        new Map([[imageKey, 0]]),
      ),
    ).toEqual([0])
  })

  describe('table', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cell2Key = keyGenerator()
    const blockKey = keyGenerator()
    const block2Key = keyGenerator()
    const spanKey = keyGenerator()
    const span2Key = keyGenerator()
    const table = {
      _key: tableKey,
      _type: 'table',
      rows: [
        {
          _key: rowKey,
          _type: 'row',
          cells: [
            {
              _key: cellKey,
              _type: 'cell',
              content: [
                {
                  _key: blockKey,
                  _type: 'block',
                  children: [{_key: spanKey, _type: 'span', text: 'foo'}],
                },
              ],
            },
            {
              _key: cell2Key,
              _type: 'cell',
              content: [
                {
                  _key: block2Key,
                  _type: 'block',
                  children: [{_key: span2Key, _type: 'span', text: 'bar'}],
                },
              ],
            },
          ],
        },
      ],
    }

    test('table -> row', () => {
      expect(
        keyedPathToIndexedPath(
          {children: [table]},
          [{_key: tableKey}, 'rows', {_key: rowKey}],
          new Map([[tableKey, 0]]),
        ),
      ).toEqual([0, 0])
    })

    test('table -> row -> cell', () => {
      expect(
        keyedPathToIndexedPath(
          {children: [table]},
          [{_key: tableKey}, 'rows', {_key: rowKey}, 'cells', {_key: cellKey}],
          new Map([[tableKey, 0]]),
        ),
      ).toEqual([0, 0, 0])
    })

    test('table -> row -> cell -> block', () => {
      expect(
        keyedPathToIndexedPath(
          {children: [table]},
          [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
          ],
          new Map([[tableKey, 0]]),
        ),
      ).toEqual([0, 0, 0, 0])
    })

    test('table -> row -> cell2 -> block2 -> span2', () => {
      expect(
        keyedPathToIndexedPath(
          {children: [table]},
          [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cell2Key},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          new Map([[tableKey, 0]]),
        ),
      ).toEqual([0, 0, 1, 0, 0])
    })
  })

  describe('returns undefined', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const root = {
      children: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
      ],
    }
    const blockIndexMap = new Map([[blockKey, 0]])

    test('first segment is not a keyed segment', () => {
      expect(
        keyedPathToIndexedPath(root, ['children'], blockIndexMap),
      ).toBeUndefined()
    })

    test('block key not in index map', () => {
      expect(
        keyedPathToIndexedPath(root, [{_key: 'unknown'}], blockIndexMap),
      ).toBeUndefined()
    })

    test('block index out of bounds', () => {
      expect(
        keyedPathToIndexedPath(
          root,
          [{_key: blockKey}],
          new Map([[blockKey, 5]]),
        ),
      ).toBeUndefined()
    })

    test('child key not found', () => {
      expect(
        keyedPathToIndexedPath(
          root,
          [{_key: blockKey}, 'children', {_key: 'unknown'}],
          blockIndexMap,
        ),
      ).toBeUndefined()
    })

    test('string segment references missing property', () => {
      expect(
        keyedPathToIndexedPath(
          root,
          [{_key: blockKey}, 'nonexistent', {_key: spanKey}],
          blockIndexMap,
        ),
      ).toBeUndefined()
    })

    test('string segment references non-array property', () => {
      expect(
        keyedPathToIndexedPath(
          root,
          [{_key: blockKey}, '_type', {_key: spanKey}],
          blockIndexMap,
        ),
      ).toBeUndefined()
    })

    test('node has no children for keyed segment', () => {
      const imageKey = keyGenerator()
      expect(
        keyedPathToIndexedPath(
          {children: [{_key: imageKey, _type: 'image'}]},
          [{_key: imageKey}, 'children', {_key: 'something'}],
          new Map([[imageKey, 0]]),
        ),
      ).toBeUndefined()
    })
  })
})
