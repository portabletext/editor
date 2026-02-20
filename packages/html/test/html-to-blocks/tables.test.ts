import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText, type ImageSchemaMatcher} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'

const imageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.blockObjects.some(
      (blockObject) => blockObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
  }
}

const inlineImageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.inlineObjects.some(
      (inlineObject) => inlineObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
  }
}

const schema = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
  }),
)

function transform(html: string) {
  return htmlToPortableText(html, {
    schema,
    parseHtml: (html) => new JSDOM(html).window.document,
    keyGenerator: createTestKeyGenerator('k'),
    matchers: {
      image: imageMatcher,
      inlineImage: inlineImageMatcher,
    },
  })
}

describe('tables', () => {
  test('simple table', () => {
    /**
     * | foo | bar  |
     * | baz | fizz |
     */
    const html = [
      '<table><tbody>',
      '<tr><td><p><span>foo</span></p></td><td><p><span>bar</span></p></td></tr>',
      '<tr><td><p><span>baz</span></p></td><td><p><span>fizz</span></p></td></tr>',
      '</tbody></table>',
    ].join('')

    expect(getTersePt({schema, value: transform(html)})).toEqual([
      'foo',
      'bar',
      'baz',
      'fizz',
    ])
  })

  test('simple table with thead', () => {
    /**
     * | foo | bar  |
     * | --- | ---  |
     * | baz | fizz |
     */
    const html = [
      '<table><thead>',
      '<tr><th><p><span>foo</span></p></th><th><p><span>bar</span></p></th></tr>',
      '</thead>',
      '<tbody>',
      '<tr><td><p><span>baz</span></p></td><td><p><span>fizz</span></p></td></tr>',
      '</tbody></table>',
    ].join('')

    expect(getTersePt({schema, value: transform(html)})).toEqual([
      'foo',
      'bar',
      'baz',
      'fizz',
    ])
  })

  test('simple table transposed', () => {
    /**
     * | foo | baz  |
     * | bar | fizz |
     */
    const html = [
      '<table><tbody>',
      '<tr><th><p><span>foo</span></p></th><td><p><span>baz</span></p></td></tr>',
      '<tr><th><p><span>bar</span></p></th><td><p><span>fizz</span></p></td></tr>',
      '</tbody></table>',
    ].join('')

    expect(getTersePt({schema, value: transform(html)})).toEqual([
      'foo',
      'baz',
      'bar',
      'fizz',
    ])
  })

  test('larger table with thead', () => {
    /**
     * | Year | Sales    | Expenses | Profit  |
     * | ---- | -------- | -------- | ------- |
     * | 2022 | \$8,000  | \$5,000  | \$3,000 |
     * | 2023 | \$10,000 | \$6,500  | \$3,500 |
     * | 2024 | \$15,000 | \$9,000  | \$6,000 |
     */
    const html = [
      '<table>',
      '<thead>',
      '<tr>',
      '<th>Year</th>',
      '<th>Sales</th>',
      '<th>Expenses</th>',
      '<th>Profit</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td>2022</td>',
      '<td>$8,000</td>',
      '<td>$5,000</td>',
      '<td>$3,000</td>',
      '</tr>',
      '<tr>',
      '<td>2023</td>',
      '<td>$10,000</td>',
      '<td>$6,500</td>',
      '<td>$3,500</td>',
      '</tr>',
      '<tr>',
      '<td>2024</td>',
      '<td>$15,000</td>',
      '<td>$9,000</td>',
      '<td>$6,000</td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('')

    expect(getTersePt({schema, value: transform(html)})).toEqual([
      'Year',
      'Sales',
      'Expenses',
      'Profit',
      '2022',
      '$8,000',
      '$5,000',
      '$3,000',
      '2023',
      '$10,000',
      '$6,500',
      '$3,500',
      '2024',
      '$15,000',
      '$9,000',
      '$6,000',
    ])
  })

  test('larger table transposed', () => {
    /**
     * |          | 2022    | 2023     | 2024     |
     * | -------- | ------- | -------- | -------- |
     * | Sales    | \$8,000 | \$10,000 | \$15,000 |
     * | Expenses | \$5,000 | \$6,500  | \$9,000  |
     * | Profit   | \$3,000 | \$3,500  | \$6,000  |
     */
    const transposed = [
      '<table>',
      '<thead>',
      '<tr>',
      '<th></th>',
      '<th>2022</th>',
      '<th>2023</th>',
      '<th>2024</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td>Sales</td>',
      '<td>$8,000</td>',
      '<td>$10,000</td>',
      '<td>$15,000</td>',
      '</tr>',
      '<tr>',
      '<td>Expenses</td>',
      '<td>$5,000</td>',
      '<td>$6,500</td>',
      '<td>$9,000</td>',
      '</tr>',
      '<tr>',
      '<td>Profit</td>',
      '<td>$3,000</td>',
      '<td>$3,500</td>',
      '<td>$6,000</td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('')

    expect(getTersePt({schema, value: transform(transposed)})).toEqual([
      '',
      '2022',
      '2023',
      '2024',
      'Sales',
      '$8,000',
      '$10,000',
      '$15,000',
      'Expenses',
      '$5,000',
      '$6,500',
      '$9,000',
      'Profit',
      '$3,000',
      '$3,500',
      '$6,000',
    ])
  })

  describe('table cell with image', () => {
    test('Google Docs', () => {
      const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-e43aaf72-7fff-b92f-4e9c-c262cf7e0bea"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt"><colgroup><col /></colgroup><tbody><tr style="height:0pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:317px;height:237px;"><img src="https://example.com/image.jpg" width="317" height="237" style="margin-left:0px;margin-top:0px;" /></span></span></p></td></tr></tbody></table></div></b>`

      expect(getTersePt({schema, value: transform(html)})).toEqual(['{image}'])
    })
  })

  describe('transposed table with images', () => {
    test('Google Docs', () => {
      const html = [
        '<meta charset="utf-8">',
        '<b id="docs-internal-guid-c40d92a5-7fff-9760-35d4-1917aed0f102">',
        '<div dir="ltr" align="left">',
        '<table>',
        '<colgroup>',
        '<col width="187" />',
        '<col width="437" />',
        '</colgroup>',
        '<thead>',
        '<tr>',
        '<th scope="col"><p dir="ltr"><span>Image asset</span></p></th>',
        '<th scope="col"><p dir="ltr"><span><span><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXctqIkh6E_Dk-oqmfwSPE2j91gaCBFgZzEknmUZswtVtBMYCGFo_mhGO8Y0zTgeyKSVDaG3xZ9b801CNN4K2WxXHFLf8JOGH0gOle9sYceFgaWVFlZ1IRe4uPe8CEij_G8U8AphUQ?key=rQm4iHsybZ8QbxaYriGRJQ" width="423" height="316" /></span></span></p></th>',
        '</tr>',
        '<tr>',
        '<th scope="col"><p dir="ltr"><span>ALT text</span></p><p dir="ltr"><span>Describe the image for people who can\'t see it</span></p></th>',
        '<th scope="col"><p dir="ltr"><span>a screenshot of a sanity app that says welcome to your sanity app</span></p></th>',
        '</tr>',
        '<tr>',
        '<th scope="col"><p dir="ltr"><span>Dark Mode Variant</span></p><p dir="ltr"><span>Optional alternate image to be used in dark mode.</span></p></th>',
        '<th scope="col"><p dir="ltr"><span><span><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXdlaYiRplD8rau0_vC2ZyY02EH8_VgBCrMqe-Ak7B1QhPN6HFQnoZo-6mo7iu4Z26tLMh-1B7XDgUCMgDX0i40yZWfVRpEQH9bBGlRihuCobXLUwj0GD0WXReszLd1iUZAfCPBSnw?key=rQm4iHsybZ8QbxaYriGRJQ" width="423" height="316" /></span></span></p></th>',
        '</tr>',
        '<tr>',
        '<th scope="col"><p dir="ltr"><span>Caption</span></p></th>',
        '<th scope="col"><p dir="ltr"><span>Create your own custom apps with the Sanity SDK</span></p></th>',
        '</tr>',
        '</thead>',
        '</table>',
        '</div>',
        '</b>',
      ].join('')

      expect(getTersePt({schema, value: transform(html)})).toEqual([
        'Image asset',
        '{image}',
        'ALT text',
        "Describe the image for people who can't see it",
        'a screenshot of a sanity app that says welcome to your sanity app',
        'Dark Mode Variant',
        'Optional alternate image to be used in dark mode.',
        '{image}',
        'Caption',
        'Create your own custom apps with the Sanity SDK',
      ])
    })
  })
})
