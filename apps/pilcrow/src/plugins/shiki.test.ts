import type {ThemedToken} from 'shiki/bundle/web'
import {describe, expect, test} from 'vitest'
import {tokensToDecorations} from './shiki'

function token(content: string, color?: string, offset = 0): ThemedToken {
  return {content, color, offset} as ThemedToken
}

describe(tokensToDecorations.name, () => {
  test('empty token array returns empty decorations', () => {
    expect(tokensToDecorations([], [], 'cb')).toEqual([])
  })

  test('one line, one token produces one decoration with the correct selection', () => {
    const decorations = tokensToDecorations(
      [[token('hello', '#ff0000')]],
      ['line0'],
      'cb',
    )
    expect(decorations).toHaveLength(1)
    expect(decorations[0]?.selection).toEqual({
      anchor: {
        path: [{_key: 'cb'}, 'lines', {_key: 'line0'}, 'children', 0],
        offset: 0,
      },
      focus: {
        path: [{_key: 'cb'}, 'lines', {_key: 'line0'}, 'children', 0],
        offset: 5,
      },
    })
  })

  test('multiple tokens on one line use offsets relative to the line, advancing past uncoloured gaps', () => {
    const decorations = tokensToDecorations(
      [
        [
          token('const', '#ff0000', 0),
          token(' ', undefined, 5),
          token('x', '#00ff00', 6),
        ],
      ],
      ['line0'],
      'cb',
    )
    expect(decorations).toHaveLength(2)
    expect(decorations[0]?.selection?.anchor.offset).toBe(0)
    expect(decorations[0]?.selection?.focus.offset).toBe(5)
    expect(decorations[1]?.selection?.anchor.offset).toBe(6)
    expect(decorations[1]?.selection?.focus.offset).toBe(7)
  })

  test('multi-line tokens distribute across line blocks', () => {
    const decorations = tokensToDecorations(
      [[token('foo', '#ff0000', 0)], [token('bar', '#00ff00', 0)]],
      ['line0', 'line1'],
      'cb',
    )
    expect(decorations).toHaveLength(2)
    expect(decorations[0]?.selection?.anchor.path).toEqual([
      {_key: 'cb'},
      'lines',
      {_key: 'line0'},
      'children',
      0,
    ])
    expect(decorations[1]?.selection?.anchor.path).toEqual([
      {_key: 'cb'},
      'lines',
      {_key: 'line1'},
      'children',
      0,
    ])
  })

  test('skips tokens without color (no styling needed)', () => {
    const decorations = tokensToDecorations(
      [[token('hello', undefined)]],
      ['line0'],
      'cb',
    )
    expect(decorations).toEqual([])
  })

  test('skips empty-content tokens', () => {
    const decorations = tokensToDecorations(
      [[token('', '#ff0000')]],
      ['line0'],
      'cb',
    )
    expect(decorations).toEqual([])
  })

  test('skips tokens for missing line keys', () => {
    const decorations = tokensToDecorations(
      [[token('foo', '#ff0000', 0)], [token('bar', '#00ff00', 0)]],
      ['line0'],
      'cb',
    )
    expect(decorations).toHaveLength(1)
  })
})
