import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {rebaseHistory, transformOperation} from './transform-operation'

const context = {schema: compileSchema(defineSchema({}))}

describe(transformOperation.name, () => {
  test('keeps an operation past a remote block insert', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const insertedBlockKey = keyGenerator()

    expect(
      transformOperation(
        context,
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
          text: 'foo',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}],
          node: {_key: insertedBlockKey, _type: 'block', children: []},
          position: 'before',
        },
        'undo',
      ),
    ).toEqual({
      operation: {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
        text: 'foo',
      },
      remoteOperation: {
        type: 'insert',
        path: [{_key: blockKey}],
        node: {_key: insertedBlockKey, _type: 'block', children: []},
        position: 'before',
      },
    })
  })

  test('drops an operation inside a remotely removed block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      transformOperation(
        context,
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
          text: 'foo',
        },
        {type: 'unset', path: [{_key: blockKey}]},
        'undo',
      ),
    ).toEqual({
      operation: undefined,
      remoteOperation: {type: 'unset', path: [{_key: blockKey}]},
    })
  })

  test('keeps an operation in another block than a remotely removed one', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const removedBlockKey = keyGenerator()

    expect(
      transformOperation(
        context,
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
          text: 'foo',
        },
        {type: 'unset', path: [{_key: removedBlockKey}]},
        'undo',
      ),
    ).toEqual({
      operation: {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 0,
        text: 'foo',
      },
      remoteOperation: {type: 'unset', path: [{_key: removedBlockKey}]},
    })
  })

  test('shifts an undone removal past a remote insert before it', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {type: 'remove.text', path: spanPath, offset: 3, text: ' bar'},
        {type: 'insert.text', path: spanPath, offset: 0, text: 'baz '},
        'undo',
      ),
    ).toEqual({
      operation: {type: 'remove.text', path: spanPath, offset: 7, text: ' bar'},
      remoteOperation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'baz ',
      },
    })
  })

  test('pulls an undone removal to the start of a remote removal spanning it', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {type: 'remove.text', path: spanPath, offset: 5, text: 'x'},
        {type: 'remove.text', path: spanPath, offset: 2, text: 'foo bar'},
        'undo',
      ),
    ).toEqual({
      operation: {type: 'remove.text', path: spanPath, offset: 2, text: 'x'},
      remoteOperation: {
        type: 'remove.text',
        path: spanPath,
        offset: 2,
        text: 'foo bar',
      },
    })
  })

  test('restores an undone removal in front of a remote insert at its offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {type: 'remove.text', path: spanPath, offset: 3, text: ' bar'},
        {type: 'insert.text', path: spanPath, offset: 3, text: 'x'},
        'undo',
      ),
    ).toEqual({
      operation: {type: 'remove.text', path: spanPath, offset: 3, text: ' bar'},
      remoteOperation: {
        type: 'insert.text',
        path: spanPath,
        offset: 7,
        text: 'x',
      },
    })
  })

  test('moves a redone removal past a remote insert at its offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {type: 'remove.text', path: spanPath, offset: 3, text: ' bar'},
        {type: 'insert.text', path: spanPath, offset: 3, text: 'x'},
        'redo',
      ),
    ).toEqual({
      operation: {type: 'remove.text', path: spanPath, offset: 4, text: ' bar'},
      remoteOperation: {
        type: 'insert.text',
        path: spanPath,
        offset: 3,
        text: 'x',
      },
    })
  })

  test('moves an undone insert past a remote insert at its offset', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {type: 'insert.text', path: spanPath, offset: 3, text: ' bar'},
        {type: 'insert.text', path: spanPath, offset: 3, text: 'x'},
        'undo',
      ),
    ).toEqual({
      operation: {type: 'insert.text', path: spanPath, offset: 4, text: ' bar'},
      remoteOperation: {
        type: 'insert.text',
        path: spanPath,
        offset: 3,
        text: 'x',
      },
    })
  })

  test('keeps a removal in another span than a remote insert', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]

    expect(
      transformOperation(
        context,
        {type: 'remove.text', path: barSpanPath, offset: 4, text: 'x'},
        {type: 'insert.text', path: fooSpanPath, offset: 0, text: 'x'},
        'undo',
      ),
    ).toEqual({
      operation: {type: 'remove.text', path: barSpanPath, offset: 4, text: 'x'},
      remoteOperation: {
        type: 'insert.text',
        path: fooSpanPath,
        offset: 0,
        text: 'x',
      },
    })
  })

  test('stops carrying a remote edit into a span the replayed operation removes', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const siblingPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]

    expect(
      transformOperation(
        context,
        {
          type: 'insert',
          path: siblingPath,
          node: {_key: spanKey, _type: 'span', text: 'foo', marks: []},
          position: 'after',
          inverse: {type: 'unset', path: spanPath},
        },
        {type: 'insert.text', path: spanPath, offset: 0, text: 'x'},
        'undo',
      ),
    ).toEqual({
      operation: {
        type: 'insert',
        path: siblingPath,
        node: {_key: spanKey, _type: 'span', text: 'foo', marks: []},
        position: 'after',
        inverse: {type: 'unset', path: spanPath},
      },
      remoteOperation: undefined,
    })
  })

  test('shifts selection points in the same span past a remote insert', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      transformOperation(
        context,
        {
          type: 'set.selection',
          properties: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 0},
          },
          newProperties: {
            anchor: {path: spanPath, offset: 3},
            focus: {path: spanPath, offset: 3},
          },
        },
        {type: 'insert.text', path: spanPath, offset: 0, text: 'x'},
        'undo',
      ),
    ).toEqual({
      operation: {
        type: 'set.selection',
        properties: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
        newProperties: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 4},
        },
      },
      remoteOperation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'x',
      },
    })
  })
})

describe(rebaseHistory.name, () => {
  test('carries a remote insert back through an undo step from its last operation', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    // `foobar` with `r`, then `a` deleted leaves `foob`, and a remote `x`
    // lands after it. Undo restores `a` at 4, which moves the `x` to 5,
    // where `r` must then be restored in front of it.
    expect(
      rebaseHistory(
        context,
        {
          undos: [
            {
              operations: [
                {type: 'remove.text', path: spanPath, offset: 5, text: 'r'},
                {type: 'remove.text', path: spanPath, offset: 4, text: 'a'},
              ],
            },
          ],
          redos: [],
        },
        {type: 'insert.text', path: spanPath, offset: 4, text: 'x'},
      ),
    ).toEqual({
      undos: [
        {
          operations: [
            {type: 'remove.text', path: spanPath, offset: 5, text: 'r'},
            {type: 'remove.text', path: spanPath, offset: 4, text: 'a'},
          ],
        },
      ],
      redos: [],
    })
  })

  test('carries a remote insert forward through a redo step from its first operation', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    // Typing `bar` after `foo` was undone and a remote `x` landed after
    // `foo`. Redo inserts `b` in front of the `x`, which moves it to 4, so
    // `a` and `r` must follow `b` in front of it too.
    expect(
      rebaseHistory(
        context,
        {
          undos: [],
          redos: [
            {
              operations: [
                {type: 'insert.text', path: spanPath, offset: 3, text: 'b'},
                {type: 'insert.text', path: spanPath, offset: 4, text: 'a'},
                {type: 'insert.text', path: spanPath, offset: 5, text: 'r'},
              ],
            },
          ],
        },
        {type: 'insert.text', path: spanPath, offset: 3, text: 'x'},
      ),
    ).toEqual({
      undos: [],
      redos: [
        {
          operations: [
            {type: 'insert.text', path: spanPath, offset: 3, text: 'b'},
            {type: 'insert.text', path: spanPath, offset: 4, text: 'a'},
            {type: 'insert.text', path: spanPath, offset: 5, text: 'r'},
          ],
        },
      ],
    })
  })

  test('shifts every operation of a step past a remote insert before them', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanPath = [
      {_key: keyGenerator()},
      'children',
      {_key: keyGenerator()},
    ]

    expect(
      rebaseHistory(
        context,
        {
          undos: [
            {
              operations: [
                {type: 'remove.text', path: spanPath, offset: 5, text: 'r'},
                {type: 'remove.text', path: spanPath, offset: 4, text: 'a'},
              ],
            },
          ],
          redos: [],
        },
        {type: 'insert.text', path: spanPath, offset: 0, text: 'é😀'},
      ),
    ).toEqual({
      undos: [
        {
          operations: [
            {type: 'remove.text', path: spanPath, offset: 8, text: 'r'},
            {type: 'remove.text', path: spanPath, offset: 7, text: 'a'},
          ],
        },
      ],
      redos: [],
    })
  })

  test('discards a step whose changes all targeted a remotely removed span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]
    const barPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]
    const barStep = {
      operations: [
        {type: 'remove.text' as const, path: barPath, offset: 0, text: 'b'},
      ],
    }

    expect(
      rebaseHistory(
        context,
        {
          undos: [
            barStep,
            {
              operations: [
                {
                  type: 'set.selection',
                  properties: {
                    anchor: {path: fooPath, offset: 1},
                    focus: {path: fooPath, offset: 1},
                  },
                  newProperties: {
                    anchor: {path: fooPath, offset: 1},
                    focus: {path: fooPath, offset: 1},
                  },
                },
                {type: 'remove.text', path: fooPath, offset: 0, text: 'f'},
              ],
            },
          ],
          redos: [],
        },
        {type: 'unset', path: fooPath},
      ),
    ).toEqual({undos: [barStep], redos: []})
  })

  test('keeps the stacks when a remote operation moves nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]
    const barPath = [{_key: blockKey}, 'children', {_key: keyGenerator()}]
    const undos = [
      {
        operations: [
          {type: 'remove.text' as const, path: barPath, offset: 0, text: 'b'},
        ],
      },
    ]
    const redos = [
      {
        operations: [
          {type: 'remove.text' as const, path: barPath, offset: 1, text: 'a'},
        ],
      },
    ]

    const rebased = rebaseHistory(
      context,
      {undos, redos},
      {type: 'insert.text', path: fooPath, offset: 0, text: 'x'},
    )

    expect(rebased.undos).toBe(undos)
    expect(rebased.redos).toBe(redos)
  })
})
