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

    // Google Docs gets its own fixture: it is the only export that carries a
    // monospace `font-family` signal, so inline code becomes `code`-decorated
    // spans (visible as extra span boundaries in the terse format). The Word
    // exports of the same document carry no monospace signal at all, so they
    // share the plain fixture.
    const tersePtGdocs = JSON.parse(
      fs
        .readFileSync(
          path.resolve(
            __dirname,
            'app-sdk-quickstart-guide.gdocs.terse-pt.json',
          ),
        )
        .toString(),
    )

    expect(getTersePt({schema, value: transform([htmlGdocs])})).toEqual(
      tersePtGdocs,
    )
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
