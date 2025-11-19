import fs from 'node:fs'
import path from 'node:path'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

const schema = compileSchema(
  defineSchema({
    styles: [
      {name: 'normal'},
      {name: 'h1'},
      {name: 'h2'},
      {name: 'h3'},
      {name: 'h4'},
      {name: 'h5'},
      {name: 'h6'},
      {name: 'blockquote'},
    ],
    blockObjects: [
      {
        name: 'image',
        fields: [{name: 'src', type: 'string'}],
      },
    ],
    inlineObjects: [
      {
        name: 'image',
        fields: [{name: 'src', type: 'string'}],
      },
    ],
  }),
)

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

  test.skip('Word', () => {
    const htmlWord = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWord])})).toEqual(tersePt)
  })

  test.skip('Word (Windows)', () => {
    const htmlWordWindows = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word.windows.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWordWindows])})).toEqual(
      tersePt,
    )
  })

  test.skip('Word Online', () => {
    const htmlWordOnline = fs
      .readFileSync(
        path.resolve(__dirname, 'app-sdk-quickstart-guide.word-online.html'),
      )
      .toString()

    expect(getTersePt({schema, value: transform([htmlWordOnline])})).toEqual(
      tersePt,
    )
  })

  test.skip('Word Online (Windows)', () => {
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
