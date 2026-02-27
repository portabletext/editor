import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

const table = `
<table>
  <tbody>
    <tr>
      <td>
        <p>foo</p>
      </td>
    </tr>
    <tr>
      <td>
        <p>bar</p>
      </td>
    </tr>
  </tbody>
</table>
`

const pre = `
<pre>foo
  bar</pre>
`

const p = `
<p><span>foo</span> <span>bar</span></p>
`

describe('Whitespace', () => {
  test('table', () => {
    expect(
      getTersePt({
        schema: compileSchema(defineSchema({})),
        value: transform([table]),
      }),
    ).toEqual(['foo', 'bar'])
  })

  test('pre', () => {
    expect(
      getTersePt({
        schema: compileSchema(defineSchema({})),
        value: transform([pre]),
      }),
    ).toEqual(['foo\n  bar'])
  })

  test('p', () => {
    expect(
      getTersePt({
        schema: compileSchema(defineSchema({})),
        value: transform([p]),
      }),
    ).toEqual(['foo bar'])
  })
})
