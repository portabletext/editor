import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

describe('Word Online', () => {
  test('foo', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW128488827 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW128488827 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span class="EOP SCXW128488827 BCX0" data-ccp-props="{&quot;134233117&quot;:false,&quot;134233118&quot;:false,&quot;201341983&quot;:0,&quot;335551550&quot;:1,&quot;335551620&quot;:1,&quot;335559685&quot;:0,&quot;335559737&quot;:0,&quot;335559738&quot;:0,&quot;335559739&quot;:160,&quot;335559740&quot;:279}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(0, 0, 0); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
  })

  test('foo *bar* baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; font-style: italic; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW158691465 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k2',
            text: 'bar',
            marks: ['em'],
          },
          {
            _type: 'span',
            _key: 'k3',
            text: ' baz',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ])
  })

  test('foo **bar** baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SpellingErrorV2Themed SpellingErrorHighlight SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-color: rgb(255, 229, 229); color: rgb(0, 0, 0); background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW11124660 BCX0" data-ccp-props="{&quot;134233117&quot;:false,&quot;134233118&quot;:false,&quot;201341983&quot;:0,&quot;335551550&quot;:1,&quot;335551620&quot;:1,&quot;335559685&quot;:0,&quot;335559737&quot;:0,&quot;335559738&quot;:0,&quot;335559739&quot;:160,&quot;335559740&quot;:279}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(0, 0, 0); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k2',
            text: 'bar',
            marks: ['strong'],
          },
          {
            _type: 'span',
            _key: 'k3',
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('foo <u>bar</u> baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: underline; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW1698578 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW1698578 BCX0" data-ccp-props="{&quot;134233117&quot;:false,&quot;134233118&quot;:false,&quot;201341983&quot;:0,&quot;335551550&quot;:1,&quot;335551620&quot;:1,&quot;335559685&quot;:0,&quot;335559737&quot;:0,&quot;335559738&quot;:0,&quot;335559739&quot;:160,&quot;335559740&quot;:279}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(0, 0, 0); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k2',
            text: 'bar',
            marks: ['underline'],
          },
          {
            _type: 'span',
            _key: 'k3',
            text: ' baz',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ])
  })
})
