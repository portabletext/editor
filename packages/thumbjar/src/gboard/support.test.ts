import {describe, expect, test} from 'vitest'
import type {Step} from '../steps.ts'
import {unsupportedNote, unsupportedReason} from './support.ts'

describe(unsupportedReason.name, () => {
  test('Gboard drives compose, enter and backspace on both keyboards', () => {
    const steps: Step[] = [
      {type: 'compose', letters: 'kyou'},
      {type: 'compose', letters: 'kyou', commit: 'space'},
      {type: 'compose', letters: 'kyou', commit: 'none'},
      {type: 'enter'},
      {type: 'backspace'},
      {type: 'backspace', times: 3},
    ]

    expect({
      en: steps.map((step) => unsupportedReason(step, 'en')),
      ja: steps.map((step) => unsupportedReason(step, 'ja')),
    }).toEqual({
      en: [undefined, undefined, undefined, undefined, undefined, undefined],
      ja: [undefined, undefined, undefined, undefined, undefined, undefined],
    })
  })

  test('a candidate commit needs the Japanese keyboard', () => {
    const step: Step = {
      type: 'compose',
      letters: 'kyou',
      commit: {candidate: '今日'},
    }

    expect({
      en: unsupportedReason(step, 'en'),
      ja: unsupportedReason(step, 'ja'),
    }).toEqual({
      en: "committing with a candidate needs keyboard 'ja', Gboard's English layout shows no conversion candidates",
      ja: undefined,
    })
  })

  test('`text` is composed from its letters on English and has no keys on Japanese QWERTY', () => {
    expect({
      en: unsupportedReason({type: 'compose', text: 'foo'}, 'en'),
      enCapital: unsupportedReason({type: 'compose', text: 'Foo'}, 'en'),
      ja: unsupportedReason({type: 'compose', text: '今日'}, 'ja'),
    }).toEqual({
      en: undefined,
      enCapital:
        "'F' needs Gboard's Shift state, which `runOnDevice` does not drive",
      ja: 'Japanese QWERTY composes kana from romaji, so `text` has no keys on it, pass the romaji as `letters`',
    })
  })

  test('`letters` names a key by its lowercase letter on both layouts', () => {
    expect({
      en: ['k', 'K'].map((letters) =>
        unsupportedReason({type: 'compose', letters}, 'en'),
      ),
      ja: ['k', 'K'].map((letters) =>
        unsupportedReason({type: 'compose', letters}, 'ja'),
      ),
    }).toEqual({
      en: [
        undefined,
        "`letters` names keys by their lowercase letter, and 'K' depends on Gboard's Shift state, so use 'k'",
      ],
      ja: [
        undefined,
        "`letters` names keys by their lowercase letter, and 'K' depends on Gboard's Shift state, so use 'k'",
      ],
    })
  })

  test('`letters` without a key on the layout are rejected', () => {
    expect({
      en: ['💥', 'kyou1', 'kyou desu'].map((letters) =>
        unsupportedReason({type: 'compose', letters}, 'en'),
      ),
      ja: ['💥', 'kyou1', 'きょう'].map((letters) =>
        unsupportedReason({type: 'compose', letters}, 'ja'),
      ),
    }).toEqual({
      en: [
        "'💥' has no key on Gboard's letter page, which only maps a to z",
        "'1' has no key on Gboard's letter page, which only maps a to z",
        "' ' has no key on Gboard's letter page, which only maps a to z",
      ],
      ja: [
        "'💥' has no key on Gboard's letter page, which only maps a to z",
        "'1' has no key on Gboard's letter page, which only maps a to z",
        "'き' has no key on Gboard's letter page, which only maps a to z",
      ],
    })
  })

  test('`text` or `letters` that is not a string is rejected', () => {
    expect([
      unsupportedReason({type: 'compose', text: null} as never, 'en'),
      unsupportedReason({type: 'compose', text: ['foo']} as never, 'en'),
      unsupportedReason({type: 'compose', letters: null} as never, 'en'),
      unsupportedReason({type: 'compose', letters: ['foo']} as never, 'ja'),
    ]).toEqual([
      '`text` is None, not a string',
      "`text` is ['foo'], not a string",
      '`letters` is None, not a string',
      "`letters` is ['foo'], not a string",
    ])
  })

  test('a commit that is null, an array or not an object is rejected', () => {
    expect(
      [null, [], 1, true, {candidate: 1}].map((commit) =>
        unsupportedReason(
          {type: 'compose', letters: 'kyou', commit} as never,
          'ja',
        ),
      ),
    ).toEqual([
      'unknown commit None',
      'unknown commit []',
      'unknown commit 1',
      'unknown commit True',
      "unknown commit {'candidate': 1}",
    ])
  })

  test('a compose step with both `letters` and `text`, or neither, is rejected', () => {
    expect([
      unsupportedReason(
        // @ts-expect-error `letters` and `text` exclude each other
        {type: 'compose', letters: 'foo', text: 'foo'},
        'en',
      ),
      // @ts-expect-error a compose step needs `letters` or `text`
      unsupportedReason({type: 'compose'}, 'en'),
    ]).toEqual([
      'a `compose` step takes `letters` or `text`, not both or neither',
      'a `compose` step takes `letters` or `text`, not both or neither',
    ])
  })

  test('a backspace count that is not a positive integer is rejected', () => {
    expect([
      unsupportedReason({type: 'backspace', times: 0}, 'en'),
      unsupportedReason({type: 'backspace', times: 1.5}, 'en'),
    ]).toEqual([
      '`times` is 0, not a positive integer',
      '`times` is 1.5, not a positive integer',
    ])
  })

  test('an unknown step type or commit is rejected at type level and at runtime', () => {
    expect([
      // @ts-expect-error `moveCaret` is not a step type yet
      unsupportedReason({type: 'moveCaret', by: 1}, 'en'),
      unsupportedReason(
        // @ts-expect-error `enter` is not a commit
        {type: 'compose', letters: 'foo', commit: 'enter'},
        'en',
      ),
    ]).toEqual(["unknown step type 'moveCaret'", "unknown commit 'enter'"])
  })

  test('a step that is not an object is rejected', () => {
    expect(
      [null, undefined, [], 1, true, 'compose'].map((step) =>
        unsupportedReason(step as never, 'en'),
      ),
    ).toEqual([
      'None is not a step',
      'None is not a step',
      'unknown step type None',
      '1 is not a step',
      'True is not a step',
      "'compose' is not a step",
    ])
  })
})

describe(unsupportedNote.name, () => {
  test('a case Gboard drives in full has no note', () => {
    expect(
      unsupportedNote(
        [
          {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
          {type: 'enter'},
          {type: 'backspace', times: 2},
        ],
        'ja',
      ),
    ).toEqual(undefined)
  })

  test('a case with one step Gboard cannot drive names its position, type and reason', () => {
    expect(
      unsupportedNote(
        [
          {type: 'compose', letters: 'foo', commit: 'none'},
          {type: 'enter'},
          {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
          {type: 'backspace'},
        ],
        'en',
      ),
    ).toEqual(
      "Gboard cannot drive step 3 (compose): committing with a candidate needs keyboard 'ja', Gboard's English layout shows no conversion candidates",
    )
  })

  test('a step that is not an object, or has no valid type, is named by its position alone', () => {
    expect(
      unsupportedNote(
        [null, undefined, {type: 'moveCaret'}, {type: 'enter'}] as never,
        'en',
      ),
    ).toEqual(
      "Gboard cannot drive step 1: None is not a step; step 2: None is not a step; step 3: unknown step type 'moveCaret'",
    )
  })

  test('an empty slot in the steps is named like an undefined step', () => {
    const steps = new Array<Step>(2)
    steps[1] = {type: 'compose', letters: 'K'}
    expect(unsupportedNote(steps, 'en')).toEqual(
      "Gboard cannot drive step 1: None is not a step; step 2 (compose): `letters` names keys by their lowercase letter, and 'K' depends on Gboard's Shift state, so use 'k'",
    )
  })
})
