import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

describe('Word', () => {
  test('foo **bar** baz', () => {
    const html = `<p class=MsoNormal>foo <b>bar</b> baz<o:p></o:p></p>`

    expect(
      getTersePt({
        schema: compileSchema(defineSchema({})),
        value: transform([html]),
      }),
    ).toEqual(['foo ,bar, baz'])
  })

  test('simple table', () => {
    const html = [
      `<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0
 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;
 mso-yfti-tbllook:1184;mso-padding-alt:0cm 5.4pt 0cm 5.4pt'>`,
      `<tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes;mso-yfti-lastrow:yes'>`,
      `<td width=301 valign=top style='width:225.4pt;border:solid windowtext 1.0pt;
  mso-border-alt:solid windowtext .5pt;padding:0cm 5.4pt 0cm 5.4pt'>`,
      `<p class=MsoNormal style='margin-bottom:0cm;line-height:200%'><span
  lang=EN-US style='mso-ansi-language:EN-US'>foo<o:p></o:p></span></p>`,
      `</td>`,
      `<td width=301 valign=top style='width:225.4pt;border:solid windowtext 1.0pt;
  border-left:none;mso-border-left-alt:solid windowtext .5pt;mso-border-alt:
  solid windowtext .5pt;padding:0cm 5.4pt 0cm 5.4pt'>`,
      `<p class=MsoNormal style='margin-bottom:0cm;line-height:200%'><span
  lang=EN-US style='mso-ansi-language:EN-US'>bar<o:p></o:p></span></p>`,
      `</td>`,
      `</tr>`,
      `</table>`,
    ].join('\n')

    expect(
      getTersePt({
        schema: compileSchema(defineSchema({})),
        value: transform([html]),
      }),
    ).toEqual(['foo', 'bar'])
  })
})
