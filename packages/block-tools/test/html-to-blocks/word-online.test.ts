import {defineSchema} from '@portabletext/schema'
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

  test('foo ***bar*** baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; font-style: italic; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW225439778 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span>`

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
            marks: ['strong', 'em'],
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

  test('foo <a>bar</a> baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo<span> </span></span></span><a class="Hyperlink SCXW151419380 BCX0" href="https://example.com/" target="_blank" rel="noreferrer noopener" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; color: inherit;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(70, 120, 134); font-size: 12pt; font-style: normal; text-decoration: underline; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: normal;"><span class="NormalTextRun SCXW151419380 BCX0" data-ccp-charstyle="Hyperlink" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span></a><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW151419380 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k1',
        children: [
          {_type: 'span', _key: 'k2', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k3', text: 'bar', marks: ['k0']},
          {_type: 'span', _key: 'k4', text: ' baz', marks: []},
        ],
        style: 'normal',
        markDefs: [{_type: 'link', _key: 'k0', href: 'https://example.com/'}],
      },
    ])
  })

  test('<u>foo <a>bar</a> baz</u>', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: underline; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo<span> </span></span></span><a class="Hyperlink SCXW140351355 BCX0" href="https://example.com/" target="_blank" rel="noreferrer noopener" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; color: inherit;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(70, 120, 134); font-size: 12pt; text-decoration: underline; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW140351355 BCX0" data-ccp-charstyle="Hyperlink" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span></a><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: underline; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW140351355 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW140351355 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(0, 0, 0); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _key: 'k1',
        _type: 'block',
        children: [
          {_key: 'k2', _type: 'span', text: 'foo ', marks: ['underline']},
          {_key: 'k3', _type: 'span', text: 'bar', marks: ['k0', 'underline']},
          {_key: 'k4', _type: 'span', text: ' baz', marks: ['underline']},
        ],
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://example.com/',
          },
        ],
        style: 'normal',
      },
    ])
  })

  test('**foo <a>bar</a> baz**', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo<span> </span></span></span><a class="Hyperlink SCXW10619595 BCX0" href="https://example.com/" target="_blank" rel="noreferrer noopener" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; color: inherit;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined MacChromeBold SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(70, 120, 134); font-size: 12pt; font-style: normal; text-decoration: underline; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW10619595 BCX0" data-ccp-charstyle="Hyperlink" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span></a><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW10619595 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span>`

    expect(transform([html])).toEqual([
      {
        _key: 'k1',
        _type: 'block',
        children: [
          {_key: 'k2', _type: 'span', text: 'foo ', marks: ['strong']},
          {_key: 'k3', _type: 'span', text: 'bar', marks: ['k0', 'strong']},
          {_key: 'k4', _type: 'span', text: ' baz', marks: ['strong']},
        ],
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://example.com/',
          },
        ],
        style: 'normal',
      },
    ])
  })

  test('q:foo bar baz', () => {
    const html = `<meta charset='utf-8'><span class="NormalTextRun SCXW6223770 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(64, 64, 64); font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-size: 16px; font-style: italic; font-variant-ligatures: none; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: center; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">foo bar<span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW6223770 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent; color: rgb(64, 64, 64); font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-size: 16px; font-style: italic; font-variant-ligatures: none; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: center; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">baz</span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []}],
        style: 'blockquote',
        markDefs: [],
      },
    ])
  })

  test('h1:foo bar baz', () => {
    const html = `<meta charset='utf-8'><span class="NormalTextRun SCXW154988541 BCX0" data-ccp-parastyle="heading 1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(15, 71, 97); font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif; font-size: 26.6667px; font-style: normal; font-variant-ligatures: none; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">foo bar<span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW154988541 BCX0" data-ccp-parastyle="heading 1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent; color: rgb(15, 71, 97); font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif; font-size: 26.6667px; font-style: normal; font-variant-ligatures: none; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">baz</span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo bar baz', marks: []}],
        style: 'h1',
        markDefs: [],
      },
    ])
  })

  test('h1:h1|h2:h2|h3:h3|h4:h4|h5:h5|h6:h6', () => {
    const html = `<meta charset='utf-8'><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="1" xml:lang="EN-US" lang="EN-US" paraid="626804849" paraeid="{c586a291-030f-4fea-973a-2b2c76858c1d}{143}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 24px 0px 5.33333px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(15, 71, 97); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-size: 20pt; line-height: 36.0375px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H1</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134233117&quot;:false,&quot;134233118&quot;:false,&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;201341983&quot;:0,&quot;335551550&quot;:1,&quot;335551620&quot;:1,&quot;335559685&quot;:0,&quot;335559737&quot;:0,&quot;335559738&quot;:360,&quot;335559739&quot;:80,&quot;335559740&quot;:279}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 20pt; line-height: 36.0375px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif; color: rgb(15, 71, 97);"> </span></p></div><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="2" xml:lang="EN-US" lang="EN-US" paraid="485247484" paraeid="{a995603d-4920-48d7-936c-2fbc9be9ef0d}{174}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 10.6667px 0px 5.33333px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(15, 71, 97); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-size: 16pt; line-height: 27.9px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H2</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;335559738&quot;:160,&quot;335559739&quot;:80}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 16pt; line-height: 27.9px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif; color: rgb(15, 71, 97);"> </span></p></div><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="3" xml:lang="EN-US" lang="EN-US" paraid="614812534" paraeid="{a995603d-4920-48d7-936c-2fbc9be9ef0d}{204}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 10.6667px 0px 5.33333px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(15, 71, 97); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-size: 14pt; line-height: 25.575px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 3" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H3</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;335559738&quot;:160,&quot;335559739&quot;:80}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 14pt; line-height: 25.575px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; color: rgb(15, 71, 97);"> </span></p></div><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="4" xml:lang="EN-US" lang="EN-US" paraid="93515592" paraeid="{a995603d-4920-48d7-936c-2fbc9be9ef0d}{216}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 5.33333px 0px 2.66667px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: italic; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(15, 71, 97); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-size: 12pt; font-style: italic; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 4" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H4</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;335559738&quot;:80,&quot;335559739&quot;:40}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; color: rgb(15, 71, 97);"> </span></p></div><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="5" xml:lang="EN-US" lang="EN-US" paraid="1045287863" paraeid="{a995603d-4920-48d7-936c-2fbc9be9ef0d}{232}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 5.33333px 0px 2.66667px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(15, 71, 97); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 5" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H5</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;335559738&quot;:80,&quot;335559739&quot;:40}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; color: rgb(15, 71, 97);"> </span></p></div><div class="OutlineElement Ltr SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW161557328 BCX0" role="heading" aria-level="6" xml:lang="EN-US" lang="EN-US" paraid="965883126" paraeid="{a995603d-4920-48d7-936c-2fbc9be9ef0d}{248}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 2.66667px 0px 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: italic; vertical-align: baseline; font-kerning: none; background-color: transparent; color: rgb(89, 89, 89); text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW161557328 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(89, 89, 89); font-size: 12pt; font-style: italic; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW161557328 BCX0" data-ccp-parastyle="heading 6" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">H6</span></span><span class="EOP SCXW161557328 BCX0" data-ccp-props="{&quot;134245418&quot;:true,&quot;134245529&quot;:true,&quot;335559738&quot;:40,&quot;335559739&quot;:0}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; color: rgb(89, 89, 89);"> </span></p></div>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'H1', marks: []}],
        style: 'h1',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [{_type: 'span', _key: 'k3', text: 'H2', marks: []}],
        style: 'h2',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [{_type: 'span', _key: 'k5', text: 'H3', marks: []}],
        style: 'h3',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k6',
        children: [{_type: 'span', _key: 'k7', text: 'H4', marks: []}],
        style: 'h4',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k8',
        children: [{_type: 'span', _key: 'k9', text: 'H5', marks: []}],
        style: 'h5',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k10',
        children: [{_type: 'span', _key: 'k11', text: 'H6', marks: []}],
        style: 'h6',
        markDefs: [],
      },
    ])
  })

  test('>-:foo\nbar>>-:baz', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle1 SCXW262809338 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="-" data-font="Aptos" data-listid="4" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:0,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Aptos&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW262809338 BCX0" xml:lang="EN-US" lang="EN-US" paraid="422093071" paraeid="{e6b8d8a2-4253-405c-9483-5bd3e1c3fcf1}{184}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo</span></span><span class="LineBreakBlob BlobObject DragDrop SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: WordVisiCarriageReturn_MSFontService, Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; white-space: pre !important;"> </span><br class="SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; white-space: pre !important;"></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span class="EOP SCXW262809338 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle2 SCXW262809338 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: verdana; overflow: visible; list-style-type: circle;"><li aria-setsize="-1" data-leveltext="o" data-font="Courier New" data-listid="4" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Courier New&quot;,&quot;469769242&quot;:[9675],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;o&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW262809338 BCX0" xml:lang="EN-US" lang="EN-US" paraid="416671292" paraeid="{71910a2c-1778-4fba-a3b9-3640a554ec37}{51}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW262809338 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">baz</span></span></p></li></ul></div>`

    expect(transform([html])).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: 'foo\nbar',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 1,
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: 'baz',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 2,
      },
    ])
  })

  test('>#:foo bar baz|>>#:foo bar baz|>>>-:foo bar baz|>>#:foo bar baz|>#:foo bar baz', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative;"><ol class="NumberListStyle1 SCXW74049237 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: decimal; overflow: visible;"><li aria-setsize="-1" data-leveltext="%1." data-font="" data-listid="2" data-list-defn-props="{&quot;335551671&quot;:1,&quot;335552541&quot;:0,&quot;335559683&quot;:0,&quot;335559684&quot;:-1,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,0,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%1.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW74049237 BCX0" xml:lang="EN-US" lang="EN-US" paraid="595509322" paraeid="{2cd3147a-14e7-4b54-bb22-e8cbf5102bcb}{10}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar</span><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">ba</span><span class="NormalTextRun SpellingErrorV2Themed SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">z</span></span><span class="EOP SCXW74049237 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div><div class="ListContainerWrapper SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative;"><ol class="NumberListStyle2 SCXW74049237 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: lower-alpha; overflow: visible;"><li aria-setsize="-1" data-leveltext="%2." data-font="" data-listid="2" data-list-defn-props="{&quot;335552541&quot;:0,&quot;335559683&quot;:1,&quot;335559684&quot;:-1,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,4,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%2.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW74049237 BCX0" xml:lang="EN-US" lang="EN-US" paraid="1419593073" paraeid="{4ab7f8c1-06f0-4766-9c6a-006d880b2d91}{50}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar<span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW74049237 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div><div class="ListContainerWrapper SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative;"><ul class="BulletListStyle1 SCXW74049237 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="" data-font="Symbol" data-listid="2" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:2,&quot;335559684&quot;:-1,&quot;335559685&quot;:2160,&quot;335559991&quot;:180,&quot;469769226&quot;:&quot;Symbol&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="3" role="listitem" class="OutlineElement Ltr SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 132px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW74049237 BCX0" xml:lang="EN-US" lang="EN-US" paraid="1556089129" paraeid="{4ab7f8c1-06f0-4766-9c6a-006d880b2d91}{243}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar<span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW74049237 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative;"><ol class="NumberListStyle2 SCXW74049237 BCX0" role="list" start="2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: lower-alpha; overflow: visible;"><li aria-setsize="-1" data-leveltext="%2." data-font="" data-listid="2" data-list-defn-props="{&quot;335552541&quot;:0,&quot;335559683&quot;:1,&quot;335559684&quot;:-1,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,4,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%2.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="2" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW74049237 BCX0" xml:lang="EN-US" lang="EN-US" paraid="474654398" paraeid="{db6700df-4b9d-4a00-9f1b-e16274cbe6c8}{186}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar<span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW74049237 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div><div class="ListContainerWrapper SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative;"><ol class="NumberListStyle1 SCXW74049237 BCX0" role="list" start="2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: decimal; overflow: visible;"><li aria-setsize="-1" data-leveltext="%1." data-font="" data-listid="2" data-list-defn-props="{&quot;335551671&quot;:1,&quot;335552541&quot;:0,&quot;335559683&quot;:0,&quot;335559684&quot;:-1,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,0,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%1.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="2" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW74049237 BCX0" xml:lang="EN-US" lang="EN-US" paraid="250452810" paraeid="{db6700df-4b9d-4a00-9f1b-e16274cbe6c8}{244}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-size: 12pt; font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar baz</span></span><span class="TabRun IPSelectionBlob BlobObject DragDrop SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; display: inline-block; font-family: Calibri, sans-serif; font-size: 12pt; font-style: normal; font-weight: 400; position: relative; text-indent: 0px; white-space: nowrap; color: rgb(0, 0, 0); font-variant-ligatures: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; width: 0px;"><span class="TabChar SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; white-space: pre !important; display: inline-block;">	</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW74049237 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-size: 12pt; font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><br class="Apple-interchange-newline">`

    expect(transform([html])).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo bar baz', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'number',
        level: 1,
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [{_key: 'k3', _type: 'span', text: 'foo bar baz', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'number',
        level: 2,
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [{_key: 'k5', _type: 'span', text: 'foo bar baz', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 3,
      },
      {
        _key: 'k6',
        _type: 'block',
        children: [{_key: 'k7', _type: 'span', text: 'foo bar baz', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'number',
        level: 2,
      },
      {
        _key: 'k8',
        _type: 'block',
        children: [{_key: 'k9', _type: 'span', text: 'foo bar baz', marks: []}],
        style: 'normal',
        markDefs: [],
        listItem: 'number',
        level: 1,
      },
    ])
  })

  test('{image}', () => {
    const html = `<meta charset='utf-8'><img width="297" height="186" src="https://example.com/image.jpg" class="WACImage CanvasCacheSaverIgnored SCXW148089371 BCX0" unselectable="on" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; border: none; white-space: pre !important; vertical-align: baseline; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">`

    expect(transform([html])).toEqual([
      {
        _type: 'image',
        _key: 'k0',
        src: 'https://example.com/image.jpg',
      },
    ])
  })

  describe('foo,{image},bar', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW227093664 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW227093664 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span class="WACImageContainer NoPadding BlobObject SCXW227093664 BCX0" role="presentation" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: move; left: 0px; position: relative; display: inline-block; text-indent: 0px; top: 2px; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; width: 297px; height: 186px;"><img width="297" height="186" src="https://example.com/image.jpg" class="WACImage CanvasCacheSaverIgnored SCXW227093664 BCX0" unselectable="on" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; border: none; white-space: pre !important; vertical-align: baseline;"></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW227093664 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW227093664 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span>`

    test('with inline object', () => {
      expect(transform([html])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo',
              marks: [],
            },
            {
              _type: 'image',
              _key: 'k2',
              src: 'https://example.com/image.jpg',
            },
            {
              _type: 'span',
              _key: 'k3',
              text: 'bar',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
    })

    test('without inline object', () => {
      expect(
        transform(
          [html],
          defineSchema({
            blockObjects: [
              {
                name: 'image',
                fields: [{name: 'src', type: 'string'}],
              },
            ],
          }),
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'foo',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
        {
          _type: 'image',
          _key: 'k2',
          src: 'https://example.com/image.jpg',
        },
        {
          _type: 'block',
          _key: 'k3',
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'bar',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('foo|{image}|bar', () => {
    const html = `<meta charset='utf-8'><div class="OutlineElement Ltr SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW157602441 BCX0" xml:lang="EN-US" lang="EN-US" paraid="1350939997" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{68}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 10.6667px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo</span></span><span class="EOP SCXW157602441 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></div><div class="OutlineElement Ltr SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW157602441 BCX0" xml:lang="EN-US" lang="EN-US" paraid="474883475" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{137}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 10.6667px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span class="SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; display: inline-block;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"></span><span class="WACImageContainer NoPadding BlobObject SCXW157602441 BCX0" role="presentation" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: move; left: 0px; position: relative; display: inline-block; text-indent: 0px; top: 2px; width: 297px; height: 186px;"><img width="297" height="186" src="https://example.com/image.jpg" class="WACImage CanvasCacheSaverIgnored SCXW157602441 BCX0" unselectable="on" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; border: none; white-space: pre !important; vertical-align: baseline;"></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"></span><span class="EOP SCXW157602441 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></div><div class="OutlineElement Ltr SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW157602441 BCX0" xml:lang="EN-US" lang="EN-US" paraid="258363401" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{157}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 10.6667px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW157602441 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span></p></div>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'image',
        _key: 'k2',
        src: 'https://example.com/image.jpg',
      },
      {
        _type: 'block',
        _key: 'k3',
        children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  describe('>-:foo|>>-{image}|>>>-:bar', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle1 SCXW122103775 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="-" data-font="Aptos" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:0,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Aptos&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW122103775 BCX0" xml:lang="EN-US" lang="EN-US" paraid="2107896427" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{68}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo</span></span><span class="EOP SCXW122103775 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle2 SCXW122103775 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: verdana; overflow: visible; list-style-type: circle;"><li aria-setsize="-1" data-leveltext="o" data-font="Courier New" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Courier New&quot;,&quot;469769242&quot;:[9675],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;o&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW122103775 BCX0" xml:lang="EN-US" lang="EN-US" paraid="587775710" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{205}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span class="SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; display: inline-block;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"></span><span class="WACImageContainer NoPadding BlobObject SCXW122103775 BCX0" role="presentation" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: move; left: 0px; position: relative; display: inline-block; text-indent: 0px; top: 2px; width: 297px; height: 186px;"><img width="297" height="186" src="https://example.com/image.jpg" class="WACImage CanvasCacheSaverIgnored SCXW122103775 BCX0" unselectable="on" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; border: none; white-space: pre !important; vertical-align: baseline;"></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"></span><span class="EOP SCXW122103775 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle3 SCXW122103775 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: verdana; font-size: 8pt; list-style-type: square; overflow: visible;"><li aria-setsize="-1" data-leveltext="" data-font="Wingdings" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:2,&quot;335559684&quot;:-2,&quot;335559685&quot;:2160,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Wingdings&quot;,&quot;469769242&quot;:[9642],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="3" role="listitem" class="OutlineElement Ltr SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 120px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW122103775 BCX0" xml:lang="EN-US" lang="EN-US" paraid="258363401" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{222}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW122103775 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span></p></li></ul></div>`

    test('with inline object', () => {
      expect(transform([html])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {
              _type: 'image',
              _key: 'k3',
              src: 'https://example.com/image.jpg',
            },
          ],
          style: 'normal',
          level: 2,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'bar', marks: []}],
          style: 'normal',
          level: 3,
          listItem: 'bullet',
          markDefs: [],
        },
      ])
    })

    test('without inline object', () => {
      expect(
        transform(
          [html],
          defineSchema({
            blockObjects: [
              {
                name: 'image',
                fields: [{name: 'src', type: 'string'}],
              },
            ],
          }),
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'image',
          _key: 'k2',
          src: 'https://example.com/image.jpg',
        },
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
          style: 'normal',
          level: 3,
          listItem: 'bullet',
          markDefs: [],
        },
      ])
    })
  })

  describe('>-:foo|>>-:bar,{image},baz|>>>-:fizz', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle1 SCXW148812999 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="-" data-font="Aptos" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:0,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Aptos&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW148812999 BCX0" xml:lang="EN-US" lang="EN-US" paraid="2107896427" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{68}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo</span></span><span class="EOP SCXW148812999 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle2 SCXW148812999 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: verdana; overflow: visible; list-style-type: circle;"><li aria-setsize="-1" data-leveltext="o" data-font="Courier New" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Courier New&quot;,&quot;469769242&quot;:[9675],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;o&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW148812999 BCX0" xml:lang="EN-US" lang="EN-US" paraid="587775710" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{205}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span class="WACImageContainer NoPadding BlobObject SCXW148812999 BCX0" role="presentation" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: move; left: 0px; position: relative; display: inline-block; text-indent: 0px; top: 2px; width: 297px; height: 186px;"><img width="297" height="186" src="https://example.com/image.jpg" class="WACImage CanvasCacheSaverIgnored SCXW148812999 BCX0" unselectable="on" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; border: none; white-space: pre !important; vertical-align: baseline;"></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">baz</span></span><span class="EOP SCXW148812999 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle3 SCXW148812999 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: verdana; font-size: 8pt; list-style-type: square; overflow: visible;"><li aria-setsize="-1" data-leveltext="" data-font="Wingdings" data-listid="3" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:2,&quot;335559684&quot;:-2,&quot;335559685&quot;:2160,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Wingdings&quot;,&quot;469769242&quot;:[9642],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="3" role="listitem" class="OutlineElement Ltr SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 120px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW148812999 BCX0" xml:lang="EN-US" lang="EN-US" paraid="258363401" paraeid="{96ee41b7-eb30-4aa9-a387-6c04024dcccb}{222}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW148812999 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">fizz</span></span></p></li></ul></div>`

    test('with inline object', () => {
      expect(transform([html])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
            {
              _type: 'image',
              _key: 'k4',
              src: 'https://example.com/image.jpg',
            },
            {_type: 'span', _key: 'k5', text: 'baz', marks: []},
          ],
          style: 'normal',
          level: 2,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k6',
          children: [{_type: 'span', _key: 'k7', text: 'fizz', marks: []}],
          style: 'normal',
          level: 3,
          listItem: 'bullet',
          markDefs: [],
        },
      ])
    })

    test('without inline object', () => {
      expect(
        transform(
          [html],
          defineSchema({
            blockObjects: [
              {
                name: 'image',
                fields: [{name: 'src', type: 'string'}],
              },
            ],
          }),
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
          level: 2,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'image',
          _key: 'k4',
          src: 'https://example.com/image.jpg',
        },
        {
          _type: 'block',
          _key: 'k5',
          children: [{_type: 'span', _key: 'k6', text: 'baz', marks: []}],
          style: 'normal',
          level: 2,
          listItem: 'bullet',
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: 'k8', text: 'fizz', marks: []}],
          style: 'normal',
          level: 3,
          listItem: 'bullet',
          markDefs: [],
        },
      ])
    })
  })

  test('foo ~~bar~~ baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo<span> </span></span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Strikethrough SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: line-through; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW266679786 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strike-through']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('**<u>foo bar baz</u>**', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined MacChromeBold SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: underline; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">f</span><span class="NormalTextRun SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">oo<span> </span></span><span class="NormalTextRun SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span><span class="NormalTextRun SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span><span class="NormalTextRun SpellingErrorV2Themed SCXW75549455 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW75549455 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; color: rgb(0, 0, 0); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo bar baz',
            marks: ['strong', 'underline'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('*<u>foo bar</u>*', () => {
    const html = `<meta charset='utf-8'><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(0, 0, 0); font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: underline; font-size: 12pt; font-style: italic; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW11124660 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo bar</span></span><span class="EOP SCXW11124660 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo bar',
            marks: ['em', 'underline'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('>#:foo|>>#:bar|>>>#:baz', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ol class="NumberListStyle1 SCXW153399635 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: decimal; overflow: visible;"><li aria-setsize="-1" data-leveltext="%1." data-font="" data-listid="5" data-list-defn-props="{&quot;335551671&quot;:1,&quot;335552541&quot;:0,&quot;335559683&quot;:0,&quot;335559684&quot;:-1,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,0,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%1.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW153399635 BCX0" xml:lang="EN-US" lang="EN-US" paraid="192203657" paraeid="{71910a2c-1778-4fba-a3b9-3640a554ec37}{173}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span class="EOP SCXW153399635 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div><div class="ListContainerWrapper SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ol class="NumberListStyle2 SCXW153399635 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: lower-alpha; overflow: visible;"><li aria-setsize="-1" data-leveltext="%2." data-font="" data-listid="5" data-list-defn-props="{&quot;335552541&quot;:0,&quot;335559683&quot;:1,&quot;335559684&quot;:-1,&quot;335559685&quot;:1440,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,4,46],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%2.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="2" role="listitem" class="OutlineElement Ltr SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 72px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW153399635 BCX0" xml:lang="EN-US" lang="EN-US" paraid="2038414925" paraeid="{71910a2c-1778-4fba-a3b9-3640a554ec37}{216}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">bar</span></span><span class="EOP SCXW153399635 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div><div class="ListContainerWrapper SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ol class="NumberListStyle3 SCXW153399635 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: lower-roman; overflow: visible;"><li aria-setsize="-1" data-leveltext="%3." data-font="" data-listid="5" data-list-defn-props="{&quot;335552541&quot;:0,&quot;335559683&quot;:2,&quot;335559684&quot;:-1,&quot;335559685&quot;:2160,&quot;335559991&quot;:180,&quot;469769242&quot;:[65533,2,46],&quot;469777803&quot;:&quot;right&quot;,&quot;469777804&quot;:&quot;%3.&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="3" role="listitem" class="OutlineElement Ltr SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 132px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW153399635 BCX0" xml:lang="EN-US" lang="EN-US" paraid="1922802654" paraeid="{71910a2c-1778-4fba-a3b9-3640a554ec37}{238}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SpellingErrorV2Themed SCXW153399635 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span><span class="EOP SCXW153399635 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ol></div>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        style: 'normal',
        level: 1,
        listItem: 'number',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        style: 'normal',
        level: 2,
        listItem: 'number',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        style: 'normal',
        level: 3,
        listItem: 'number',
        markDefs: [],
      },
    ])
  })

  test('h2:**foo** bar baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW180542833 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 16pt; line-height: 27.9px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW180542833 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW180542833 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(15, 71, 97); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 16pt; line-height: 27.9px; font-family: &quot;Aptos Display&quot;, &quot;Aptos Display_EmbeddedFont&quot;, &quot;Aptos Display_MSFontService&quot;, sans-serif;"><span class="NormalTextRun SCXW180542833 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span>bar<span> </span></span><span class="NormalTextRun SCXW180542833 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">ba</span><span class="NormalTextRun SCXW180542833 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">z</span></span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: ['strong']},
          {_type: 'span', _key: 'k2', text: ' bar baz', marks: []},
        ],
        style: 'h2',
        markDefs: [],
      },
    ])
  })

  test('>-:**foo** bar|>-:<a>baz</a>', () => {
    const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle1 SCXW4408066 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="-" data-font="Aptos" data-listid="6" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:0,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Aptos&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW4408066 BCX0" xml:lang="EN-US" lang="EN-US" paraid="901470150" paraeid="{d06a04a5-da1a-401e-b93e-7d5357dcc766}{53}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: normal;"><span class="NormalTextRun SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span>bar</span></span><span class="EOP SCXW4408066 BCX0" data-ccp-props="{}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"> </span></p></li></ul></div><div class="ListContainerWrapper SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ul class="BulletListStyle1 SCXW4408066 BCX0" role="list" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; list-style-type: disc; cursor: text; font-family: verdana; overflow: visible;"><li aria-setsize="-1" data-leveltext="-" data-font="Aptos" data-listid="6" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559683&quot;:0,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Aptos&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-aria-posinset="2" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 12pt; font-family: Aptos, Aptos_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW4408066 BCX0" xml:lang="EN-US" lang="EN-US" paraid="260603609" paraeid="{d06a04a5-da1a-401e-b93e-7d5357dcc766}{193}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="auto" xml:lang="EN-US" lang="EN-US" class="TextRun EmptyTextRun SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"></span><a class="Hyperlink SCXW4408066 BCX0" href="https://example.com/" target="_blank" rel="noreferrer noopener" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; text-decoration: none; color: inherit;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined SCXW4408066 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(70, 120, 134); font-size: 12pt; text-decoration: underline; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: normal;"><span class="NormalTextRun SpellingErrorV2Themed SCXW4408066 BCX0" data-ccp-charstyle="Hyperlink" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-position: 0px 100%; background-repeat: repeat-x; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjQiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggc3Ryb2tlPSIjRUIwMDAwIiBkPSJNMCAzYzEuMjUgMCAxLjI1LTIgMi41LTJTMy43NSAzIDUgMyIvPjxwYXRoIGQ9Ik0wIDBoNXY0SDB6Ii8+PC9nPjwvc3ZnPg==&quot;); border-bottom: 1px solid transparent;">baz</span></span></a></p></li></ul></div>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k1',
        children: [
          {_type: 'span', _key: 'k2', text: 'foo', marks: ['strong']},
          {_type: 'span', _key: 'k3', text: ' bar', marks: []},
        ],
        style: 'normal',
        markDefs: [],
        listItem: 'bullet',
        level: 1,
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: ['k0']}],
        style: 'normal',
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://example.com/',
          },
        ],
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('q:**foo** bar baz', () => {
    const html = `<meta charset='utf-8'><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun MacChromeBold SCXW235726852 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(64, 64, 64); font-style: italic; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: center; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW235726852 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun SCXW235726852 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(64, 64, 64); font-style: italic; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: center; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-size: 12pt; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif;"><span class="NormalTextRun SCXW235726852 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span>bar<span> </span></span><span class="NormalTextRun SCXW235726852 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">ba</span><span class="NormalTextRun SCXW235726852 BCX0" data-ccp-parastyle="Quote" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">z</span></span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: ['strong']},
          {_type: 'span', _key: 'k2', text: ' bar baz', marks: []},
        ],
        style: 'blockquote',
        markDefs: [],
      },
    ])
  })

  test('<a>**foo**</a>', () => {
    const html = `<meta charset='utf-8'><a class="Hyperlink SCXW145214343 BCX0" href="https://example.com/" target="_blank" rel="noreferrer noopener" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration: none; color: inherit;"><span data-contrast="none" xml:lang="EN-US" lang="EN-US" class="TextRun Underlined MacChromeBold SCXW145214343 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(70, 120, 134); font-size: 12pt; text-decoration: underline; line-height: 20.925px; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW145214343 BCX0" data-ccp-charstyle="Hyperlink" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">foo</span></span></a>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k1',
        children: [
          {_type: 'span', _key: 'k2', text: 'foo', marks: ['k0', 'strong']},
        ],
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://example.com/',
          },
        ],
        style: 'normal',
      },
    ])
  })

  test('(empty paragraph)', () => {
    const html = `<meta charset='utf-8'><span style="color: rgb(0, 0, 0); font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, sans-serif; font-size: 16px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;"> </span>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
  })

  describe('Misc edge cases', () => {
    test('App SDK Quickstart Guide #1', () => {
      const html = `<meta charset='utf-8'><span data-contrast="none" xml:lang="EN" lang="EN" class="TextRun SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 11pt; font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; color: rgb(81, 88, 112); line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif;"><span class="FindHit SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-color: rgb(255, 238, 128) !important;">Sele</span><span class="FindHit SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; background-color: rgb(255, 238, 128) !important;">ct</span><span class="NormalTextRun SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span></span></span><span data-contrast="none" xml:lang="EN" lang="EN" class="TextRun MacChromeBold SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; font-size: 11pt; font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; color: rgb(81, 88, 112); line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">yes</span></span><span data-contrast="none" xml:lang="EN" lang="EN" class="TextRun SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; font-size: 11pt; font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; color: rgb(81, 88, 112); line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif;"><span class="NormalTextRun SCXW240811054 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;"><span> </span>when asked to install the sanity package</span></span><span class="EOP SCXW240811054 BCX0" data-ccp-props="{&quot;201341983&quot;:0,&quot;335559738&quot;:240,&quot;335559740&quot;:240}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 11pt; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif; color: rgb(81, 88, 112);"> </span>`

      expect(transform([html])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'Select ', marks: []},
            {_type: 'span', _key: 'k2', text: 'yes', marks: ['strong']},
            {
              _type: 'span',
              _key: 'k3',
              text: ' when asked to install the sanity package',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
    })

    test('heading in list item', () => {
      const html = `<meta charset='utf-8'><div class="ListContainerWrapper SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; position: relative; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><ol class="NumberListStyle1 SCXW209013985 BCX0" role="list" start="1" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; cursor: text; list-style-type: decimal; overflow: visible;"><li aria-setsize="-1" data-leveltext="%1." data-font="Inter" data-listid="1" data-list-defn-props="{&quot;335552541&quot;:0,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769242&quot;:[65533,0],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;%1.&quot;,&quot;469777815&quot;:&quot;multilevel&quot;}" data-aria-posinset="1" data-aria-level="1" role="listitem" class="OutlineElement Ltr SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px 0px 0px 24px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; display: block; font-size: 17pt; font-family: Inter, Inter_MSFontService, sans-serif; vertical-align: baseline;"><p class="Paragraph SCXW209013985 BCX0" role="heading" aria-level="2" paraid="516715379" paraeid="{c0448659-fa62-4ff5-a786-fdede7c8b79b}{149}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN" lang="EN" class="TextRun MacChromeBold SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; -webkit-font-smoothing: antialiased; font-variant-ligatures: none !important; color: rgb(81, 88, 112); font-size: 17pt; line-height: 26px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif; font-weight: bold;"><span class="NormalTextRun SCXW209013985 BCX0" data-ccp-parastyle="heading 2" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">Create a new App SDK app</span></span><span class="EOP SCXW209013985 BCX0" data-ccp-props="{&quot;134245418&quot;:false,&quot;134245529&quot;:false,&quot;201341983&quot;:0,&quot;335559738&quot;:360,&quot;335559739&quot;:80,&quot;335559740&quot;:240}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 17pt; line-height: 26px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif; color: rgb(81, 88, 112);"> </span></p></li></ol></div><div class="OutlineElement Ltr SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; clear: both; cursor: text; overflow: visible; position: relative; direction: ltr; color: rgb(0, 0, 0); font-family: &quot;Segoe UI&quot;, &quot;Segoe UI Web&quot;, Arial, Verdana, sans-serif; font-size: 12px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><p class="Paragraph SCXW209013985 BCX0" paraid="565379831" paraeid="{c0448659-fa62-4ff5-a786-fdede7c8b79b}{158}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 16px 0px; padding: 0px; user-select: text; overflow-wrap: break-word; font-weight: normal; font-style: normal; vertical-align: baseline; font-kerning: none; background-color: transparent; color: windowtext; text-align: left; text-indent: 0px;"><span data-contrast="none" xml:lang="EN" lang="EN" class="TextRun SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-variant-ligatures: none !important; color: rgb(81, 88, 112); font-size: 11pt; line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif;"><span class="NormalTextRun SCXW209013985 BCX0" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text;">Initialize a new project by running </span></span><span class="EOP SCXW209013985 BCX0" data-ccp-props="{&quot;201341983&quot;:0,&quot;335559738&quot;:240,&quot;335559739&quot;:240,&quot;335559740&quot;:240}" style="-webkit-user-drag: none; -webkit-tap-highlight-color: transparent; margin: 0px; padding: 0px; user-select: text; font-size: 11pt; line-height: 17px; font-family: Inter, Inter_EmbeddedFont, Inter_MSFontService, sans-serif; color: rgb(81, 88, 112);"> </span></p></div>`

      expect(transform([html])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _type: 'span',
              _key: 'k1',
              text: 'Create a new App SDK app',
              marks: ['strong'],
            },
          ],
          style: 'h2',
          markDefs: [],
          listItem: 'number',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [
            {
              _type: 'span',
              _key: 'k3',
              text: 'Initialize a new project by running',
              marks: [],
            },
          ],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })
})
