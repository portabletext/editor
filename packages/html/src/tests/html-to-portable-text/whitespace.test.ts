import {compileSchema, defineSchema} from '@portabletext/schema'
import {toTextspec} from '@portabletext/textspec'
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
      toTextspec({
        schema: compileSchema(defineSchema({})),
        value: transform([table]),
      }),
    ).toBe('P: foo\nP: bar')
  })

  test('pre', () => {
    expect(
      toTextspec({
        schema: compileSchema(defineSchema({})),
        value: transform([pre]),
      }),
    ).toBe('P: foo\n  bar')
  })

  test('p', () => {
    expect(
      toTextspec({
        schema: compileSchema(defineSchema({})),
        value: transform([p]),
      }),
    ).toBe('P: foo bar')
  })
})
