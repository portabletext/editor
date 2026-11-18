import {readFileSync} from 'node:fs'
import type {Patch} from '@portabletext/patches'
import {
  compileSchema,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {interpretChange} from './interpret-change'
import {walkNodes, collectRangePoints} from './lib/document'
import {mapRange} from './map-range'
import {mapPoint, type Point, type Step} from './step-mapper'

const spanA = [{_key: 'b1'}, 'children', {_key: 's1'}]
const spanB = [{_key: 'b1'}, 'children', {_key: 's2'}]

describe(`${mapRange.name} with explicit steps`, () => {
  test('an insertion exactly at the range start rides the start past it, so the inserted text falls outside the range', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 4, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 7},
      focus: {path: spanA, offset: 11},
    })
  })

  test('an insertion exactly at the range end leaves the end behind it, so the inserted text falls outside the range', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 8, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    })
  })

  test('an insertion strictly inside the range grows it', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 6, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 11},
    })
  })

  test('a collapsed range at an insertion point stays collapsed, before the insertion', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 4, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a collapsed range strictly inside a later insertion still moves with it', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 2, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 7},
      focus: {path: spanA, offset: 7},
    })
  })

  test.each([
    {name: 'start', offset: 4, expectedOffset: 4, path: spanA},
    {name: 'end', offset: 8, expectedOffset: 4, path: spanB},
  ])(
    'maps a caret at the $name of moved text with backward affinity',
    ({offset, expectedOffset, path}) => {
      const range = {
        anchor: {path: spanA, offset},
        focus: {path: spanA, offset},
      }
      const steps: Array<Step> = [
        {
          type: 'move.text',
          from: {path: spanA, offset: 4, length: 4},
          to: {path: spanB, offset: 0},
        },
      ]

      expect(mapRange(steps, range)).toEqual({
        anchor: {path, offset: expectedOffset},
        focus: {path, offset: expectedOffset},
      })
    },
  )

  test('a caret at an insertion stays before it with backward affinity', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 4, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a removal spanning the range end clamps the end to the removal start', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 6},
    }
    const steps: Array<Step> = [
      {type: 'remove.text', path: spanA, offset: 4, length: 10},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a removal spanning the range start clamps the start to the removal start', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 10},
    }
    const steps: Array<Step> = [
      {type: 'remove.text', path: spanA, offset: 0, length: 6},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 0},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a removed anchor shrinks to the surviving focus span', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanB, offset: 2},
    }
    const steps: Array<Step> = [
      {type: 'remove.node', nearest: {path: spanB, offset: 0}, path: spanA},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 0},
      focus: {path: spanB, offset: 2},
    })
  })

  test('a removed focus shrinks to the surviving anchor span', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanB, offset: 2},
    }
    const steps: Array<Step> = [
      {type: 'remove.node', nearest: {path: spanA, offset: 21}, path: spanB},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 21},
    })
  })

  test('a move.text carrying the whole range moves both ends together', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 5},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 0, length: 7},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 2},
      focus: {path: spanB, offset: 5},
    })
  })

  test('a move.text at the range boundaries carries both edges with the moved text', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 4, length: 4},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 0},
      focus: {path: spanB, offset: 4},
    })
  })

  test('a move.text carries both edges of a backward range with the moved text', () => {
    const range = {
      backward: true,
      anchor: {path: spanA, offset: 8},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 4, length: 4},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      backward: true,
      anchor: {path: spanB, offset: 4},
      focus: {path: spanB, offset: 0},
    })
  })

  test('an insertion at the end of a backward range stays outside the range', () => {
    const range = {
      backward: true,
      anchor: {path: spanA, offset: 8},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 8, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      backward: true,
      anchor: {path: spanA, offset: 8},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a collapsed range at a move boundary stays collapsed at the destination', () => {
    const range = {
      anchor: {path: spanA, offset: 8},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 4, length: 4},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 4},
      focus: {path: spanB, offset: 4},
    })
  })

  test('a collapsed range at the start of moved text stays behind', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 4, length: 4},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual(range)
  })

  test('an unrelated step on a different path leaves the range untransformed', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 5},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanB, offset: 0, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual(range)
  })
})

describe(`${mapRange.name} with deleted range endpoints`, () => {
  test('a range starting in a deleted span shrinks to its surviving text in the next span', () => {
    const steps: Array<Step> = [
      {
        type: 'remove.node',
        nearest: {path: [{_key: 'b0'}, 'children', {_key: 's2'}], offset: 0},
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
      },
    ]

    const range = {anchor: at('b0', 's1', 1), focus: at('b0', 's2', 2)}

    expect(mapRange(steps, range)).toEqual({
      anchor: at('b0', 's2', 0),
      focus: at('b0', 's2', 2),
    })
  })

  test('a range ending in a deleted span shrinks to its surviving text in the previous span', () => {
    const steps: Array<Step> = [
      {
        type: 'remove.node',
        nearest: {path: [{_key: 'b0'}, 'children', {_key: 's1'}], offset: 3},
        path: [{_key: 'b0'}, 'children', {_key: 's2'}],
      },
    ]

    const range = {anchor: at('b0', 's1', 1), focus: at('b0', 's2', 2)}

    expect(mapRange(steps, range)).toEqual({
      anchor: at('b0', 's1', 1),
      focus: at('b0', 's1', 3),
    })
  })

  test('a range that starts at the end of a block follows its own text when that block moves away', () => {
    const base = [block('b0', [['s0', 'abc']]), block('b1', [['s1', 'def']])]
    const moved = base[1]!
    const steps = interpretChange({value: base}, [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'before',
        items: [moved],
        origin: 'local',
      },
    ])

    const range = {anchor: at('b0', 's0', 3), focus: at('b1', 's1', 2)}

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 3},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    })
  })

  test('a backward range keeps its direction', () => {
    const steps: Array<Step> = [
      {
        type: 'remove.node',
        nearest: {path: [{_key: 'b0'}, 'children', {_key: 's2'}], offset: 0},
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
      },
    ]
    const range = {
      backward: true,
      anchor: at('b0', 's2', 2),
      focus: at('b0', 's1', 1),
    }

    expect(mapRange(steps, range)).toEqual({
      backward: true,
      anchor: at('b0', 's2', 2),
      focus: at('b0', 's2', 0),
    })
  })

  test('collapses deleted selections at the surviving gap at root depth', () => {
    const withinSpan = readRangeCapture('delete-within-span@root')
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(withinSpan.schema),
              value: withinSpan.seedValue,
            },
            withinSpan.patches,
          ),
          {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
          },
        ),
      )
      .toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      })

    const typedAcrossBlocks = readRangeCapture('range-type-across-blocks@root')
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(typedAcrossBlocks.schema),
              value: typedAcrossBlocks.seedValue,
            },
            typedAcrossBlocks.patches,
          ),
          {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 1},
          },
        ),
      )
      .toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      })

    const deletedAcrossBlocks = readRangeCapture(
      'range-delete-across-three-blocks@root',
    )
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(deletedAcrossBlocks.schema),
              value: deletedAcrossBlocks.seedValue,
            },
            deletedAcrossBlocks.patches,
          ),
          {
            anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
            focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 1},
          },
        ),
      )
      .toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
      })

    expect
      .soft(
        mapRange(
          interpretChange({value: withinSpan.seedValue}, [
            {
              type: 'diffMatchPatch',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: '@@ -1,11 +1,3 @@\n-foo bar \n baz\n',
            },
          ]),
          {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
          },
        ),
      )
      .toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      })

    expect
      .soft(
        mapRange(
          interpretChange({value: withinSpan.seedValue}, [
            {
              type: 'diffMatchPatch',
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
              value: '@@ -1,11 +0,0 @@\n-foo bar baz\n',
            },
          ]),
          {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
          },
        ),
      )
      .toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      })
  })

  test('collapses deleted selections at the surviving gap at container depth', () => {
    const withinSpan = readRangeCapture('delete-within-span@container')
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(withinSpan.schema),
              value: withinSpan.seedValue,
            },
            withinSpan.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k2'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 4,
            },
            focus: {
              path: [
                {_key: 'k2'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 5,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
      })

    const typedAcrossBlocks = readRangeCapture(
      'range-type-across-blocks@container',
    )
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(typedAcrossBlocks.schema),
              value: typedAcrossBlocks.seedValue,
            },
            typedAcrossBlocks.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k4'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k4'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 1,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      })

    const deletedAcrossBlocks = readRangeCapture(
      'range-delete-across-three-blocks@container',
    )
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(deletedAcrossBlocks.schema),
              value: deletedAcrossBlocks.seedValue,
            },
            deletedAcrossBlocks.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k6'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k6'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 1,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
      })
  })

  test('collapses deleted selections at the surviving gap at nested depth', () => {
    const withinSpan = readRangeCapture('delete-within-span@nested')
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(withinSpan.schema),
              value: withinSpan.seedValue,
            },
            withinSpan.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k3'},
                'content',
                {_key: 'k2'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 4,
            },
            focus: {
              path: [
                {_key: 'k3'},
                'content',
                {_key: 'k2'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 5,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
        focus: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
      })

    const typedAcrossBlocks = readRangeCapture(
      'range-type-across-blocks@nested',
    )
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(typedAcrossBlocks.schema),
              value: typedAcrossBlocks.seedValue,
            },
            typedAcrossBlocks.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k5'},
                'content',
                {_key: 'k4'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k5'},
                'content',
                {_key: 'k4'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 1,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k4'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k4'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 3,
        },
      })

    const deletedAcrossBlocks = readRangeCapture(
      'range-delete-across-three-blocks@nested',
    )
    expect
      .soft(
        mapRange(
          interpretChange(
            {
              schema: compileSchema(deletedAcrossBlocks.schema),
              value: deletedAcrossBlocks.seedValue,
            },
            deletedAcrossBlocks.patches,
          ),
          {
            anchor: {
              path: [
                {_key: 'k7'},
                'content',
                {_key: 'k6'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k7'},
                'content',
                {_key: 'k6'},
                'content',
                {_key: 'k2'},
                'children',
                {_key: 'k3'},
              ],
              offset: 1,
            },
          },
        ),
      )
      .toEqual({
        anchor: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
      })
  })
})

describe(`${mapRange.name} when endpoints cross after moves`, () => {
  test('when the block holding the end of "c\\nde" moves above the block holding its start, the range keeps its endpoints', () => {
    const base = [block('b0', [['s0', 'abc']]), block('b1', [['s1', 'def']])]
    const moved = base[1]!
    const patches = [
      {type: 'unset' as const, path: [{_key: 'b1'}], origin: 'local' as const},
      {
        type: 'insert' as const,
        path: [{_key: 'b0'}],
        position: 'before' as const,
        items: [moved],
        origin: 'local' as const,
      },
    ]
    const steps = interpretChange({value: base}, patches)
    const range = {anchor: at('b0', 's0', 2), focus: at('b1', 's1', 2)}

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 2},
      focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    })
  })

  test('a block moved between the edges of "c\\nde" without swapping them leaves the edges alone', () => {
    const base = [
      block('b0', [['s0', 'abc']]),
      block('b1', [['s1', 'def']]),
      block('b2', [['s2', 'ghi']]),
    ]
    const steps = interpretChange({value: base}, [
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'after',
        items: [base[2]!],
        origin: 'local',
      },
    ])
    const range = {anchor: at('b0', 's0', 2), focus: at('b1', 's1', 2)}

    expect(mapRange(steps, range)).toEqual({
      anchor: at('b0', 's0', 2),
      focus: at('b1', 's1', 2),
    })
  })
})

describe(`${mapRange.name} with nested object fields`, () => {
  test('object field text is included when shrinking range', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    expect(
      mapRange(
        [
          {
            type: 'remove.node',
            nearest: {
              path: [
                {_key: key0},
                'details',
                'body',
                {_key: key1},
                'children',
                {_key: key3},
              ],
              offset: 0,
            },
            path: [
              {_key: key0},
              'details',
              'body',
              {_key: key1},
              'children',
              {_key: key2},
            ],
          },
        ],
        {
          anchor: {
            path: [
              {_key: key0},
              'details',
              'body',
              {_key: key1},
              'children',
              {_key: key2},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: key0},
              'details',
              'body',
              {_key: key1},
              'children',
              {_key: key3},
            ],
            offset: 2,
          },
        },
      ),
    ).toEqual({
      anchor: {
        path: [
          {_key: key0},
          'details',
          'body',
          {_key: key1},
          'children',
          {_key: key3},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: key0},
          'details',
          'body',
          {_key: key1},
          'children',
          {_key: key3},
        ],
        offset: 2,
      },
    })
  })
})

test.each(['root', 'container', 'nested'])(
  'removed carets collapse at %s depth',
  (depth) => {
    const fixture = readRangeCapture(
      `range-delete-across-three-blocks@${depth}`,
    )
    const schema = compileSchema(fixture.schema)
    const points = collectRangePoints(fixture.seedValue, schema)
    const middle = points[1]!
    const change = interpretChange(
      {schema, value: fixture.seedValue},
      fixture.patches,
    )
    const gap = {path: points[0]!.path, offset: 2}
    expect(mapRange(change, {anchor: middle, focus: middle})).toEqual({
      anchor: gap,
      focus: gap,
    })
  },
)

test.each(['root', 'container', 'nested'])(
  'keeps a deleted gap in its surviving span at %s depth',
  (depth) => {
    const fixture = readRangeCapture(
      `range-delete-across-three-blocks@${depth}`,
    )
    const schema = compileSchema(fixture.schema)
    const points = collectRangePoints(fixture.seedValue, schema)
    const middle = points[1]!
    const change = interpretChange({schema, value: fixture.seedValue}, [
      {
        type: 'diffMatchPatch',
        path: [...middle.path, 'text'],
        value: '@@ -1,3 +0,0 @@\n-bar\n',
      },
    ])
    const gap = {path: middle.path, offset: 0}
    expect(
      mapRange(change, {
        anchor: gap,
        focus: {path: middle.path, offset: 3},
      }),
    ).toEqual({anchor: gap, focus: gap})
  },
)

test.each(['root', 'container', 'nested'])(
  'maps inline-object edges inward in both directions at %s depth',
  (depth) => {
    const fixture = readRangeCapture(
      `range-delete-across-three-blocks@${depth}`,
    )
    const keyGenerator = createTestKeyGenerator()
    const inlineKey = keyGenerator()
    const schema = compileSchema({
      ...fixture.schema,
      inlineObjects: [{name: 'stock'}],
    })
    const points = collectRangePoints(fixture.seedValue, schema)
    const middle = points[1]!
    const parentPath = middle.path.slice(0, -2)
    const parent = walkNodes(fixture.seedValue, [], schema).find(
      ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
    )!
    parent.node['children'] = [
      {_type: 'stock', _key: inlineKey},
      {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
    ]
    const change = interpretChange(
      {schema, value: fixture.seedValue},
      fixture.patches,
    )
    const start = {path: points[0]!.path, offset: 1}
    const inline = {
      path: [...parentPath, 'children', {_key: inlineKey}],
      offset: 0,
    }
    const end = {path: points[0]!.path, offset: 2}
    expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
      anchor: start,
      focus: end,
    })
    expect(
      mapRange(change, {backward: true, anchor: inline, focus: start}),
    ).toEqual({backward: true, anchor: end, focus: start})
  },
)

test.each(['root', 'container', 'nested'])(
  'keeps the surviving inline object before an edge insertion at %s depth',
  (depth) => {
    const fixture = readRangeCapture(`type-text@${depth}`)
    const schema = compileSchema({
      ...fixture.schema,
      inlineObjects: [{name: 'stock'}],
    })
    const points = collectRangePoints(fixture.seedValue, schema)
    const first = points[0]!
    const parentPath = first.path.slice(0, -2)
    const parent = walkNodes(fixture.seedValue, [], schema).find(
      ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
    )!
    const keyGenerator = createTestKeyGenerator('inline')
    const inlineKey = keyGenerator()
    const spanKey = keyGenerator()
    parent.node['children'] = [
      {_type: 'stock', _key: inlineKey},
      {_type: 'span', _key: spanKey, text: 'bar', marks: []},
    ]
    const path = [...parentPath, 'children', {_key: spanKey}]
    const change = interpretChange({schema, value: fixture.seedValue}, [
      {
        type: 'diffMatchPatch',
        path: [...path, 'text'],
        value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
      },
    ])
    const inline = {
      path: [...parentPath, 'children', {_key: inlineKey}],
      offset: 0,
    }
    const end = {path, offset: 2}
    const mappedStart = inline
    const mappedEnd = {path, offset: 3}
    expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
      anchor: mappedStart,
      focus: mappedEnd,
    })
    expect(
      mapRange(change, {backward: true, anchor: end, focus: inline}),
    ).toEqual({backward: true, anchor: mappedEnd, focus: mappedStart})
  },
)

test.each(['root', 'container', 'nested'])(
  'keeps a removed span gap in its surviving block at %s depth',
  (depth) => {
    const fixture = readRangeCapture(
      `range-delete-across-three-blocks@${depth}`,
    )
    const schema = compileSchema(fixture.schema)
    const points = collectRangePoints(fixture.seedValue, schema)
    const middle = points[1]!
    const parentPath = middle.path.slice(0, -2)
    const keyGenerator = createTestKeyGenerator('gap')
    const spanKey = keyGenerator()
    const parent = walkNodes(fixture.seedValue, [], schema).find(
      ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
    )!
    const child = {_type: 'span', _key: spanKey, text: 'baz', marks: []}
    const original = points[1]!.path.at(-1)
    if (typeof original !== 'object') {
      throw new Error('Expected a keyed span')
    }
    parent.node['children'] = [
      {_type: 'span', _key: original._key, text: 'bar', marks: []},
      child,
    ]
    const after = structuredClone(fixture.seedValue)
    const afterParent = walkNodes(after, [], schema).find(
      ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
    )!
    afterParent.node['children'] = [child]
    const gap = {path: [...parentPath, 'children', {_key: spanKey}], offset: 0}
    const change: Array<Step> = [
      {type: 'remove.node', nearest: gap, path: middle.path},
    ]
    expect(
      mapRange(change, {
        anchor: {path: middle.path, offset: 0},
        focus: {path: middle.path, offset: 3},
      }),
    ).toEqual({anchor: gap, focus: gap})
  },
)

test('freezes the step array, step objects and their nested addresses', () => {
  const fixture = readRangeCapture('block-split@root')
  const steps = interpretChange({value: fixture.seedValue}, fixture.patches)
  const step = steps![0]!
  if (step.type !== 'move.text') {
    throw new Error('Expected a text move')
  }
  expect([
    Object.isFrozen(steps),
    Object.isFrozen(step),
    Object.isFrozen(step.from),
    Object.isFrozen(step.to),
    Object.isFrozen(step.from.path),
    Object.isFrozen(step.from.path[0]),
  ]).toEqual([true, true, true, true, true, true])
})

test.each(['root', 'container', 'nested'])(
  'maps captured inline-only range forms inward at %s depth',
  (depth) => {
    for (const kind of ['unrelated', 'left']) {
      const capture = JSON.parse(
        readFileSync(
          new URL(
            `./__fixtures__/inline-ranges/${depth}-${kind}.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      ) as {
        before: Array<PortableTextBlock>
        schemaDefinition: SchemaDefinition
        mutations: Array<{patches: Array<Patch>}>
        points: {left: Point; inline: Point; right: Point}
      }
      const change = interpretChange(
        {
          schema: compileSchema(capture.schemaDefinition),
          value: capture.before,
        },
        capture.mutations.flatMap((mutation) => mutation.patches),
      )
      const {left, inline, right} = capture.points
      const mappedLeft = {
        ...left,
        offset: left.offset + (kind === 'left' ? 1 : 0),
      }
      expect(mapRange(change, {anchor: left, focus: inline})).toEqual({
        anchor: mappedLeft,
        focus: inline,
      })
      expect(mapRange(change, {anchor: left, focus: right})).toEqual({
        anchor: mappedLeft,
        focus: right,
      })
      expect(
        mapRange(change, {backward: true, anchor: right, focus: left}),
      ).toEqual({backward: true, anchor: right, focus: mappedLeft})
      expect(mapRange(change, {anchor: inline, focus: right})).toEqual({
        anchor: inline,
        focus: right,
      })
    }
  },
)

test('nearest merged gap annotation-remove root', () => {
  const fixture = readRangeCapture('annotation-remove@root')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest merged gap decorator-remove-whole-span root', () => {
  const fixture = readRangeCapture('decorator-remove-whole-span@root')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest removed span root', () => {
  const fixture = readRangeCapture('type-text@root')
  const schema = compileSchema(fixture.schema)
  const first = collectRangePoints(fixture.seedValue, schema)[0]!
  const parentPath = first.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('gap')
  const keys = [keyGenerator(), keyGenerator(), keyGenerator(), keyGenerator()]
  parent.node['children'] = keys.map((key) => ({
    _type: 'span',
    _key: key,
    text: 'foo',
    marks: [],
  }))
  const after = structuredClone(fixture.seedValue)
  const afterParent = walkNodes(after, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  afterParent.node['children'] = keys
    .filter((_, index) => index !== 2)
    .map((key) => ({_type: 'span', _key: key, text: 'foo', marks: []}))
  const path = [...parentPath, 'children', {_key: keys[2]!}]
  const expected = {
    path: [...parentPath, 'children', {_key: keys[1]!}],
    offset: 3,
  }
  const change: Array<Step> = [{type: 'remove.node', nearest: expected, path}]
  expect(
    mapRange(change, {
      anchor: {path, offset: 0},
      focus: {path, offset: 3},
    }),
  ).toEqual({anchor: expected, focus: expected})
})

test('surviving inline object unrelated root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...points[1]!.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('surviving inline object adjacent root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...end.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('removed block path collapsed root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = removed
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: gap,
    focus: gap,
  })
})

test('removed block path range root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = {path: points[0]!.path, offset: 1}
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: start,
    focus: gap,
  })
})

test('nearest merged gap annotation-remove container', () => {
  const fixture = readRangeCapture('annotation-remove@container')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest merged gap decorator-remove-whole-span container', () => {
  const fixture = readRangeCapture('decorator-remove-whole-span@container')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest removed span container', () => {
  const fixture = readRangeCapture('type-text@container')
  const schema = compileSchema(fixture.schema)
  const first = collectRangePoints(fixture.seedValue, schema)[0]!
  const parentPath = first.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('gap')
  const keys = [keyGenerator(), keyGenerator(), keyGenerator(), keyGenerator()]
  parent.node['children'] = keys.map((key) => ({
    _type: 'span',
    _key: key,
    text: 'foo',
    marks: [],
  }))
  const after = structuredClone(fixture.seedValue)
  const afterParent = walkNodes(after, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  afterParent.node['children'] = keys
    .filter((_, index) => index !== 2)
    .map((key) => ({_type: 'span', _key: key, text: 'foo', marks: []}))
  const path = [...parentPath, 'children', {_key: keys[2]!}]
  const expected = {
    path: [...parentPath, 'children', {_key: keys[1]!}],
    offset: 3,
  }
  const change: Array<Step> = [{type: 'remove.node', nearest: expected, path}]
  expect(
    mapRange(change, {
      anchor: {path, offset: 0},
      focus: {path, offset: 3},
    }),
  ).toEqual({anchor: expected, focus: expected})
})

test('surviving inline object unrelated container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...points[1]!.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('surviving inline object adjacent container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...end.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('removed block path collapsed container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = removed
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: gap,
    focus: gap,
  })
})

test('removed block path range container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = {path: points[0]!.path, offset: 1}
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: start,
    focus: gap,
  })
})

test('nearest merged gap annotation-remove nested', () => {
  const fixture = readRangeCapture('annotation-remove@nested')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest merged gap decorator-remove-whole-span nested', () => {
  const fixture = readRangeCapture('decorator-remove-whole-span@nested')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const start = {path: points[1]!.path, offset: 3}
  const end = {path: points[2]!.path, offset: 0}
  const expected = {path: points[0]!.path, offset: 7}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapRange(change, {anchor: start, focus: start})).toEqual({
    anchor: expected,
    focus: expected,
  })
  expect(mapPoint(change, start, {affinity: 'backward'})).toEqual(expected)
})

test('nearest removed span nested', () => {
  const fixture = readRangeCapture('type-text@nested')
  const schema = compileSchema(fixture.schema)
  const first = collectRangePoints(fixture.seedValue, schema)[0]!
  const parentPath = first.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('gap')
  const keys = [keyGenerator(), keyGenerator(), keyGenerator(), keyGenerator()]
  parent.node['children'] = keys.map((key) => ({
    _type: 'span',
    _key: key,
    text: 'foo',
    marks: [],
  }))
  const after = structuredClone(fixture.seedValue)
  const afterParent = walkNodes(after, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  afterParent.node['children'] = keys
    .filter((_, index) => index !== 2)
    .map((key) => ({_type: 'span', _key: key, text: 'foo', marks: []}))
  const path = [...parentPath, 'children', {_key: keys[2]!}]
  const expected = {
    path: [...parentPath, 'children', {_key: keys[1]!}],
    offset: 3,
  }
  const change: Array<Step> = [{type: 'remove.node', nearest: expected, path}]
  expect(
    mapRange(change, {
      anchor: {path, offset: 0},
      focus: {path, offset: 3},
    }),
  ).toEqual({anchor: expected, focus: expected})
})

test('surviving inline object unrelated nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...points[1]!.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('surviving inline object adjacent nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const firstKey = keyGenerator()
  const inlineKey = keyGenerator()
  const lastKey = keyGenerator()
  parent.node['children'] = [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    {_type: 'stock', _key: inlineKey},
    {_type: 'span', _key: lastKey, text: 'bar', marks: []},
  ]
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const end = {path: [...parentPath, 'children', {_key: lastKey}], offset: 0}
  const change = interpretChange({schema, value: fixture.seedValue}, [
    {
      type: 'diffMatchPatch',
      path: [...end.path, 'text'],
      value: '@@ -1,3 +1,4 @@\n+X\n bar\n',
    },
  ])
  expect(mapRange(change, {anchor: inline, focus: end})).toEqual({
    anchor: inline,
    focus: end,
  })
  expect(
    mapRange(change, {backward: true, anchor: end, focus: inline}),
  ).toEqual({backward: true, anchor: end, focus: inline})
  const start = {path: [...parentPath, 'children', {_key: firstKey}], offset: 3}
  expect(mapRange(change, {anchor: start, focus: inline})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(
    mapRange(change, {backward: true, anchor: inline, focus: start}),
  ).toEqual({backward: true, anchor: inline, focus: start})
})

test('removed block path collapsed nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = removed
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: gap,
    focus: gap,
  })
})

test('removed block path range nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema(fixture.schema)
  const points = collectRangePoints(fixture.seedValue, schema)
  const removed = {path: points[1]!.path.slice(0, -2), offset: 0}
  const start = {path: points[0]!.path, offset: 1}
  const gap = {path: points[0]!.path, offset: 2}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: removed})).toEqual({
    anchor: start,
    focus: gap,
  })
})

test('collapsed mappings do not build range caches', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  let keyReads = 0
  const value = [
    {
      _type: 'block',
      get _key() {
        keyReads++
        return blockKey
      },
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      markDefs: [],
    },
  ]
  const change: Array<Step> = []
  const point = {
    path: [{_key: blockKey}, 'children', {_key: value[0]!.children[0]!._key}],
    offset: 1,
  }
  expect(mapRange(change, {anchor: point, focus: point})).toEqual({
    anchor: point,
    focus: point,
  })
  expect(keyReads).toEqual(0)
})

test('surviving inline endpoint root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const start = {path: points[0]!.path, offset: 1}
  const end = inline
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: inline, focus: start},
  )
})

test('surviving removed next block root', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@root')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const start = {path: points[0]!.path, offset: 1}
  const end = {path: points[1]!.path, offset: 3}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: {path: points[0]!.path, offset: 2},
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: {path: points[0]!.path, offset: 2}, focus: start},
  )
})

test('surviving inline endpoint container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const start = {path: points[0]!.path, offset: 1}
  const end = inline
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: inline, focus: start},
  )
})

test('surviving removed next block container', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@container')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const start = {path: points[0]!.path, offset: 1}
  const end = {path: points[1]!.path, offset: 3}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: {path: points[0]!.path, offset: 2},
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: {path: points[0]!.path, offset: 2}, focus: start},
  )
})

test('surviving inline endpoint nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const inline = {
    path: [...parentPath, 'children', {_key: inlineKey}],
    offset: 0,
  }
  const start = {path: points[0]!.path, offset: 1}
  const end = inline
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: inline,
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: inline, focus: start},
  )
})

test('surviving removed next block nested', () => {
  const fixture = readRangeCapture('range-delete-across-three-blocks@nested')
  const schema = compileSchema({
    ...fixture.schema,
    inlineObjects: [{name: 'stock'}],
  })
  const points = collectRangePoints(fixture.seedValue, schema)
  const parentPath = points[0]!.path.slice(0, -2)
  const parent = walkNodes(fixture.seedValue, [], schema).find(
    ({path}) => JSON.stringify(path) === JSON.stringify(parentPath),
  )!
  const keyGenerator = createTestKeyGenerator('inline')
  const inlineKey = keyGenerator()
  const children = parent.node['children']
  if (!Array.isArray(children)) {
    throw new Error('Expected children')
  }
  children.push({_type: 'stock', _key: inlineKey})
  const start = {path: points[0]!.path, offset: 1}
  const end = {path: points[1]!.path, offset: 3}
  const change = interpretChange(
    {schema, value: fixture.seedValue},
    fixture.patches,
  )
  expect(mapRange(change, {anchor: start, focus: end})).toEqual({
    anchor: start,
    focus: {path: points[0]!.path, offset: 2},
  })
  expect(mapRange(change, {backward: true, anchor: end, focus: start})).toEqual(
    {backward: true, anchor: {path: points[0]!.path, offset: 2}, focus: start},
  )
})

test('maps the real editor range-delete comment at root depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL('./__fixtures__/nearest/root-range-delete.json', import.meta.url),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
  })
})

test('maps the real editor drag-block comment at root depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL('./__fixtures__/nearest/root-drag-block.json', import.meta.url),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 2},
  })
})

test('maps the real editor range-delete comment at callout depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/callout-range-delete.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {
      path: [{_key: 'k6'}, 'content', {_key: 'k4'}, 'children', {_key: 'k5'}],
      offset: 0,
    },
    focus: {
      path: [{_key: 'k6'}, 'content', {_key: 'k4'}, 'children', {_key: 'k5'}],
      offset: 0,
    },
  })
})

test('maps the real editor drag-block comment at callout depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/callout-drag-block.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {
      path: [{_key: 'k6'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 1,
    },
    focus: {
      path: [{_key: 'k6'}, 'content', {_key: 'k4'}, 'children', {_key: 'k5'}],
      offset: 2,
    },
  })
})

test('maps the real editor range-delete comment at table depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/table-range-delete.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {
      path: [
        {_key: 'k8'},
        'rows',
        {_key: 'k7'},
        'cells',
        {_key: 'k6'},
        'content',
        {_key: 'k4'},
        'children',
        {_key: 'k5'},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: 'k8'},
        'rows',
        {_key: 'k7'},
        'cells',
        {_key: 'k6'},
        'content',
        {_key: 'k4'},
        'children',
        {_key: 'k5'},
      ],
      offset: 0,
    },
  })
})

test('repeated letters make the range-delete diff ambiguous', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/root-range-delete-repeated.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const steps = interpretChange({value: fixture.before}, fixture.patches)
  expect(mapRange(steps, fixture.comment)).toEqual({
    anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
  })
})

test('collapses a deleted comment before the remaining paste steps at root depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/root-heading-range-paste.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(
    mapRange(steps, {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
    }),
  ).toEqual({
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
    focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
  })
})

test('collapses a deleted comment before the remaining paste steps at callout depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/callout-heading-range-paste.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(
    mapRange(steps, {
      anchor: {
        path: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 1,
      },
      focus: {
        path: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
      },
    }),
  ).toEqual({
    anchor: {
      path: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 1,
    },
    focus: {
      path: [{_key: 'k4'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 1,
    },
  })
})

test('collapses a deleted comment before the remaining paste steps at table depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/table-heading-range-paste.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(
    mapRange(steps, {
      anchor: {
        path: [
          {_key: 'k6'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k4'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'k6'},
          'rows',
          {_key: 'k5'},
          'cells',
          {_key: 'k4'},
          'content',
          {_key: 'k0'},
          'children',
          {_key: 'k1'},
        ],
        offset: 2,
      },
    }),
  ).toEqual({
    anchor: {
      path: [
        {_key: 'k6'},
        'rows',
        {_key: 'k5'},
        'cells',
        {_key: 'k4'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 1,
    },
    focus: {
      path: [
        {_key: 'k6'},
        'rows',
        {_key: 'k5'},
        'cells',
        {_key: 'k4'},
        'content',
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
      ],
      offset: 1,
    },
  })
})

test('collapses a deleted comment before the remaining type steps at root depth', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        './__fixtures__/nearest/root-heading-range-type.json',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  const schema = compileSchema(fixture.schemaDefinition)
  const steps = interpretChange(
    {schema, value: fixture.before},
    fixture.patches,
  )
  expect(steps === undefined).toEqual(false)
  expect(
    mapRange(steps, {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
    }),
  ).toEqual({
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
    focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
  })
})

test('preserves an explicit forward flag when a range collapses during a change', () => {
  const keyGenerator = createTestKeyGenerator()
  const path = [{_key: keyGenerator()}, 'children', {_key: keyGenerator()}]
  expect(
    mapRange(
      [
        {type: 'remove.text', path, offset: 1, length: 2},
        {type: 'insert.text', path, offset: 1, length: 3},
      ],
      {
        anchor: {path, offset: 1},
        focus: {path, offset: 2},
        backward: false,
      },
    ),
  ).toEqual({
    anchor: {path, offset: 1},
    focus: {path, offset: 1},
    backward: false,
  })
})

test('preserves a backward flag when a collapsed range maps before an insertion', () => {
  const keyGenerator = createTestKeyGenerator()
  const path = [{_key: keyGenerator()}, 'children', {_key: keyGenerator()}]
  expect(
    mapRange([{type: 'insert.text', path, offset: 1, length: 3}], {
      anchor: {path, offset: 1},
      focus: {path, offset: 1},
      backward: true,
    }),
  ).toEqual({
    anchor: {path, offset: 1},
    focus: {path, offset: 1},
    backward: true,
  })
})

const block = (key: string, spans: Array<[key: string, text: string]>) =>
  ({
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: spans.map(([spanKey, text]) => ({
      _type: 'span',
      _key: spanKey,
      text,
      marks: [],
    })),
  }) satisfies PortableTextBlock

const at = (blockKey: string, spanKey: string, offset: number) => ({
  path: [{_key: blockKey}, 'children', {_key: spanKey}],
  offset,
})

function readRangeCapture(name: string): {
  seedValue: Array<PortableTextBlock>
  patches: Array<Patch>
  schema: SchemaDefinition
} {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/wire-catalogue/${name}.json`, import.meta.url),
      'utf8',
    ),
  )
}
