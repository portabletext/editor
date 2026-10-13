import {describe, expect, test} from 'vitest'
import {serverChecks} from './gherkin'

describe(serverChecks.name, () => {
  test('a block that is not an object gets the check of its own, and the other blocks are spelled as textspec', () => {
    expect(
      serverChecks({
        rev: 'r2',
        blocks: [
          // @ts-expect-error: the stored field holds a string block
          'oops',
          {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            style: 'normal',
          },
        ],
      }),
    ).toEqual({
      checks: [
        'the server has "B: bar"',
        'the server has a block that is not an object',
      ],
      omitted: null,
    })
  })

  test("a block below the floor that textspec can't spell leaves the blocks unchecked, and says why", () => {
    expect(
      serverChecks({
        rev: 'r2',
        blocks: [
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            style: 'normal',
          },
          // @ts-expect-error: the stored block has no `_type`
          {
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            style: 'normal',
          },
        ],
      }),
    ).toEqual({
      checks: [],
      omitted:
        "The server holds a block below the floor that textspec can't spell, so no check pins the server's blocks.",
    })
  })

  test('no document, no field and an empty list each have their own check', () => {
    expect([
      serverChecks({rev: null, blocks: null}),
      serverChecks({rev: 'r1', blocks: null}),
      serverChecks({rev: 'r1', blocks: []}),
    ]).toEqual([
      {checks: ['the server has no document'], omitted: null},
      {checks: ['the server has no field'], omitted: null},
      {checks: ['the server has an empty list'], omitted: null},
    ])
  })
})
