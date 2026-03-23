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

  test('bullet and numbered lists with multi-level definitions', () => {
    // Word assigns arbitrary lfo numbers per document. The list type is
    // determined by the @list CSS definitions in the <style> block, not by
    // the lfo reference number.
    //
    // This test uses a realistic Word structure where l0 is numbered at
    // level1 but has bullet sub-levels (level2+). The lookup must be
    // level-aware: "l0:level1" is numbered, "l0:level2" is bullet.
    const html = [
      `<html><head><style>`,
      `@list l0:level1 { mso-level-number-position:left; }`,
      `@list l0:level2 { mso-level-number-format:bullet; mso-level-text:o; }`,
      `@list l0:level3 { mso-level-number-format:bullet; }`,
      `@list l1:level1 { mso-level-number-format:bullet; mso-level-text:-; }`,
      `@list l1:level2 { mso-level-number-format:alpha-lower; }`,
      `</style></head><body>`,
      `<p class=MsoListParagraphCxSpFirst style='mso-list:l1 level1 lfo1'>`,
      `<span lang=EN-US>Unordered list</span></p>`,
      `<p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo2'>`,
      `<span lang=EN-US>Ordered list</span></p>`,
      `</body></html>`,
    ].join('\n')

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Unordered list', marks: []},
        ],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 1,
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [
          {_type: 'span', _key: 'k3', text: 'Ordered list', marks: []},
        ],
        style: 'normal',
        markDefs: [],
        listItem: 'number',
        level: 1,
      },
    ])
  })

  test('list type detection without style block falls back to bullet', () => {
    // When there's no <style> block to parse, fall back to bullet
    const html = [
      `<p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'>`,
      `<span lang=EN-US>item one</span></p>`,
    ].join('\n')

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'item one', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 1,
      },
    ])
  })
})
