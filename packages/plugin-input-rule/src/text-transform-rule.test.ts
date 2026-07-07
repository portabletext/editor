import {expect, test} from 'vitest'
import {defineTextTransformRule} from './text-transform-rule'

test('accepts record transforms whose keys name existing named groups', () => {
  expect(() =>
    defineTextTransformRule({
      on: /\d+\s?(?<operator>[*x])\s?\d+/,
      transform: {operator: () => '\u00d7'},
    }),
  ).not.toThrow()
})

test('throws when a transform key names a group the pattern does not have', () => {
  expect(() =>
    defineTextTransformRule({
      on: /\d+\s?(?<operator>[*x])\s?\d+/,
      transform: {operater: () => '\u00d7'},
    }),
  ).toThrowError(
    'defineTextTransformRule: `transform` targets the group "operater", but `on` (/\\d+\\s?(?<operator>[*x])\\s?\\d+/) has no such named capture group. Named groups: "operator"',
  )
})

test('throws when a record transform is used with a pattern that has no named groups', () => {
  expect(() =>
    defineTextTransformRule({
      on: /\d+\s?([*x])\s?\d+/,
      transform: {operator: () => '\u00d7'},
    }),
  ).toThrowError(
    'defineTextTransformRule: `transform` targets the group "operator", but `on` (/\\d+\\s?([*x])\\s?\\d+/) has no such named capture group. The pattern has no named capture groups',
  )
})

test('accepts patterns whose validation probe requires the original flags', () => {
  // `\u{2716}` is a syntax error without the `u` flag; the probe must keep
  // it when recompiling the pattern.
  expect(() =>
    defineTextTransformRule({
      on: /\u{2716}(?<digit>\d)/u,
      transform: {digit: () => ''},
    }),
  ).not.toThrow()
})

test('accepts function transforms regardless of capture groups, the whole match is replaced', () => {
  expect(() =>
    defineTextTransformRule({
      on: /!(?<word>\w+)!/,
      transform: () => 'WHOLE',
    }),
  ).not.toThrow()
})
