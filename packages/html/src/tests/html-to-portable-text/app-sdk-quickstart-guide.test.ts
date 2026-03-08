import fs from 'node:fs'
import path from 'node:path'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {toTextspec} from '@portabletext/textspec'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

const schema = compileSchema(defineSchema({}))

describe('App SDK Quickstart Guide', () => {
  const expectedTextspec = fs
    .readFileSync(path.resolve(__dirname, 'app-sdk-quickstart-guide.textspec'))
    .toString()

  test('Google Docs', () => {
    const htmlGdocs = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.gdocs.html'),
      )
      .toString()

    expect(toTextspec({schema, value: transform([htmlGdocs])})).toBe(
      expectedTextspec,
    )
  })

  test('Word', () => {
    const htmlWord = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.html'),
      )
      .toString()

    expect(toTextspec({schema, value: transform([htmlWord])})).toBe(
      expectedTextspec,
    )
  })

  test('Word (Windows)', () => {
    const htmlWordWindows = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.windows.html'),
      )
      .toString()

    expect(toTextspec({schema, value: transform([htmlWordWindows])})).toBe(
      expectedTextspec,
    )
  })

  test('Word Online', () => {
    const htmlWordOnline = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word-online.html'),
      )
      .toString()

    expect(toTextspec({schema, value: transform([htmlWordOnline])})).toBe(
      expectedTextspec,
    )
  })

  test('Word Online (Windows)', () => {
    const htmlWordOnlineWindows = fs
      .readFileSync(
        path.resolve(
          __dirname,
          'app-sdk-quickstart-guide.word-online.windows.html',
        ),
      )
      .toString()

    expect(
      toTextspec({schema, value: transform([htmlWordOnlineWindows])}),
    ).toBe(expectedTextspec)
  })
})
