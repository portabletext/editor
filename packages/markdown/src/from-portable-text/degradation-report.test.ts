import {describe, expect, test} from 'vitest'
import {
  buildSerializeDegradationMessage,
  truncateSnippet,
} from './degradation-report'

describe(truncateSnippet.name, () => {
  test('backs off from a cut landing mid-surrogate-pair, keeping the result well-formed', () => {
    const text = `${'a'.repeat(39)}\u{1f600}bcdef`
    const result = truncateSnippet(text)

    expect(result).toEqual(`${'a'.repeat(39)}...`)
    expect(result?.isWellFormed()).toEqual(true)
  })
})

describe(buildSerializeDegradationMessage.name, () => {
  test('a group past the per-group cap lists the first five snippets and tallies the rest', () => {
    const degradations = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(
      (snippet, index) => ({
        type: 'decorator-dropped' as const,
        message:
          'Removed the `highlight` decorator, kept the text: no `highlight` mark renderer',
        path: [{_key: `b${index}`}, 'children', {_key: `s${index}`}],
        topIndex: index,
        snippet,
      }),
    )

    expect(buildSerializeDegradationMessage(degradations)).toEqual(
      [
        'Portable Text could not be serialized to Markdown without loss:',
        '- Removed the `highlight` decorator, kept the text: no `highlight` mark renderer (7\u00d7: "a", "b", "c", "d", "e", and 2 more)',
      ].join('\n'),
    )
  })

  test('a group where some entries have no snippet reports the blocks it spans instead of a snippet list', () => {
    const message = buildSerializeDegradationMessage([
      {
        type: 'decorator-dropped',
        message:
          'Removed the `highlight` decorator, kept the text: no `highlight` mark renderer',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        topIndex: 0,
        snippet: 'a',
      },
      {
        type: 'decorator-dropped',
        message:
          'Removed the `highlight` decorator, kept the text: no `highlight` mark renderer',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        topIndex: 1,
      },
    ])

    expect(message).toEqual(
      [
        'Portable Text could not be serialized to Markdown without loss:',
        '- Removed the `highlight` decorator, kept the text: no `highlight` mark renderer (2\u00d7: blocks 0, 1)',
      ].join('\n'),
    )
  })

  test('two different groups sort by their earliest `topIndex`, even when encountered in reverse order', () => {
    const message = buildSerializeDegradationMessage([
      {
        type: 'style-fallback',
        message:
          'Dropped the `fancy` style, kept the text: no `fancy` block renderer',
        path: [{_key: 'b5'}],
        topIndex: 5,
        snippet: 'z',
      },
      {
        type: 'decorator-dropped',
        message:
          'Removed the `highlight` decorator, kept the text: no `highlight` mark renderer',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        topIndex: 1,
        snippet: 'a',
      },
    ])

    expect(message).toEqual(
      [
        'Portable Text could not be serialized to Markdown without loss:',
        '- block 1: Removed the `highlight` decorator, kept the text: no `highlight` mark renderer ("a")',
        '- block 5: Dropped the `fancy` style, kept the text: no `fancy` block renderer ("z")',
      ].join('\n'),
    )
  })
})
