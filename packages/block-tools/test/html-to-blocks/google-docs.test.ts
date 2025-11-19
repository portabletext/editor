import {defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

describe('Google Docs', () => {
  test('bar', () => {
    const html = `
<meta charset='utf-8'>
<meta charset="utf-8">
<b style="font-weight:normal;" id="docs-internal-guid-ac5018eb-7fff-d0c0-7959-8b02431638d0">
  <span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span>
</b>
`
    const htmlFirefox = `
<meta charset="utf-8">
<span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;" id="docs-internal-guid-859851a0-7fff-ecd6-dd94-485076b6240d">bar</span>
`

    expect(transform([html, htmlFirefox])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'bar',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('foo **bar** baz', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-efb765aa-7fff-f09e-de37-a7ec993053af"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo </span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> baz</span></b>`
    const htmlFirefox = `

<meta charset="utf-8"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;" id="docs-internal-guid-e3338d2c-7fff-1146-75ed-aabb81b6de12">foo </span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> baz</span>`

    expect(transform([html, htmlFirefox])).toEqual([
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

  test('foo|bar|baz', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-aed31538-7fff-a7ff-a5d7-c899102fcdcd"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p></b>`
    const htmlFirefox = `<meta charset="utf-8"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" id="docs-internal-guid-8069edcf-7fff-3e39-45ea-dd2323623d62"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p>`

    expect(transform([html, htmlFirefox])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        style: 'normal',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        style: 'normal',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
  })

  test('>-:foo|>>-:bar|>>>-baz', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-074aa6fd-7fff-e468-ac36-9292e8a44179"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p></li></ul></ul></ul></b>`
    const htmlFirefox = `<meta charset="utf-8"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;" id="docs-internal-guid-5112124b-7fff-685d-3357-03823d93a2a5"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p></li></ul></ul></ul>`

    expect(transform([html, htmlFirefox])).toEqual([
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
        listItem: 'bullet',
        level: 1,
        style: 'normal',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [
          {
            _type: 'span',
            _key: 'k3',
            text: 'bar',
            marks: [],
          },
        ],
        listItem: 'bullet',
        level: 2,
        style: 'normal',
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'k4',
        children: [
          {
            _type: 'span',
            _key: 'k5',
            text: 'baz',
            marks: [],
          },
        ],
        listItem: 'bullet',
        level: 3,
        style: 'normal',
        markDefs: [],
      },
    ])
  })

  test('{image}', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1deb8b11-7fff-b776-9a0a-26a451cbf1d7"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:624px;height:113px;"><img src="https://example.com/image.jpg" width="624" height="113" style="margin-left:0px;margin-top:0px;" /></span></span></b>`
    const htmlFirefox = `<meta charset="utf-8"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;" id="docs-internal-guid-77bbcea3-7fff-548f-ea9a-3be732767dcc"><span style="border:none;display:inline-block;overflow:hidden;width:624px;height:113px;"><img src="https://example.com/image.jpg" width="624" height="113" style="margin-left:0px;margin-top:0px;" /></span></span>`

    expect(transform([html, htmlFirefox])).toEqual([
      {
        _type: 'image',
        _key: 'k0',
        src: 'https://example.com/image.jpg',
      },
    ])
  })

  describe('foo,{image},bar', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-739473cb-7fff-a402-d133-6728a2575c8c"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:624px;height:113px;"><img src="https://example.com/image.jpg" width="624" height="113" style="margin-left:0px;margin-top:0px;" /></span></span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></b>`
    const htmlFirefox = `<meta charset="utf-8"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;" id="docs-internal-guid-13c2af7d-7fff-6c8e-a70c-c8e1cc119d45">foo</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span>`

    test('with inline object', () => {
      expect(transform([html, htmlFirefox])).toEqual([
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
      // Fallback to block object if no inline object is defined
      expect(
        transform(
          [html, htmlFirefox],
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
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-77e8501e-7fff-fa89-1913-318cd36b5d51"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p></b>`
    const htmlFirefox = `<meta charset="utf-8"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" id="docs-internal-guid-f1ade64f-7fff-9fe2-043c-e8e92616d360"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p>`

    expect(transform([html, htmlFirefox])).toEqual([
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

  describe('foo|bar,{image},baz|fizz', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-5cb67bc7-7fff-b597-bc57-02975e057b2f"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">fizz</span></p></b>`
    const htmlFirefox = `<meta charset="utf-8"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" id="docs-internal-guid-8f6ab745-7fff-ebb3-ff51-ceb1fafeadd8"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">fizz</span></p>`
    const htmlSafari = `<b id="docs-internal-guid-5237faf6-7fff-76c7-b86a-4a9db1e2b57e" style="font-style: normal; font-variant-caps: normal; letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: auto; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration: none; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-weight: normal;"><p dir="ltr" style="line-height: 1.38; margin-top: 0pt; margin-bottom: 0pt;"><span style="font-size: 12pt; font-family: Arial, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 400; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-variant-alternates: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;">foo</span></p><p dir="ltr" style="line-height: 1.38; margin-top: 0pt; margin-bottom: 0pt;"><span style="font-size: 12pt; font-family: Arial, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 400; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-variant-alternates: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;">bar</span><span style="font-size: 12pt; font-family: Arial, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 400; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-variant-alternates: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;"><span style="border: medium; display: inline-block; overflow: hidden; width: 51px; height: 36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left: 0px; margin-top: 0px;"></span></span><span style="font-size: 12pt; font-family: Arial, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 400; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-variant-alternates: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;">baz</span></p><p dir="ltr" style="line-height: 1.38; margin-top: 0pt; margin-bottom: 0pt;"><span style="font-size: 12pt; font-family: Arial, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 400; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-variant-alternates: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;">fizz</span></p></b>`

    test('with inline object', () => {
      expect(transform([html, htmlFirefox, htmlSafari])).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
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
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k6',
          children: [{_type: 'span', _key: 'k7', text: 'fizz', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })

    test('without inline object', () => {
      // Fallback to block object if no inline object is defined
      expect(
        transform(
          [html, htmlFirefox, htmlSafari],
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
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
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
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'k7',
          children: [{_type: 'span', _key: 'k8', text: 'fizz', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  describe('>-:foo|>>-{image}|>>>-:bar', () => {
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-21b1dabc-7fff-4851-a63d-7cae9e940987"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span></p></li></ul></ul></ul></b>`

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
    const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-372272bf-7fff-7d31-ab02-6ab3b0aa0c4d"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">foo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">bar</span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:51px;height:36px;"><img src="https://example.com/image.jpg" width="51" height="36" style="margin-left:0px;margin-top:0px;" /></span></span><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">baz</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">fizz</span></p></li></ul></ul></ul></b>`

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
})
