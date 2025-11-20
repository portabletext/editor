import fs from 'node:fs'
import path from 'node:path'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

const schema = compileSchema(defineSchema({}))

describe('App SDK Quickstart Guide', () => {
  const tersePt = JSON.parse(
    fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.terse-pt.json'),
      )
      .toString(),
  )

  test('Google Docs', () => {
    const htmlGdocs = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.gdocs.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlGdocs])})).toEqual(tersePt)
  })

  test('Word', () => {
    const htmlWord = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWord])})).toEqual(tersePt)
  })

  test('Word (Windows)', () => {
    const htmlWordWindows = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.windows.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWordWindows])})).toEqual(
      tersePt,
    )
  })

  test('Word Online', () => {
    const htmlWordOnline = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word-online.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWordOnline])})).toEqual(
      tersePt,
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
      getTersePt({schema, value: transform([htmlWordOnlineWindows])}),
    ).toEqual(tersePt)
  })
})
