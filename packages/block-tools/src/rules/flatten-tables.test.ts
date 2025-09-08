import {compileSchema, defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {createTestKeyGenerator} from '../../test/test-key-generator'
import {htmlToBlocks} from '../index'
import type {ImageSchemaMatcher} from '../schema-matchers'
import type {HtmlDeserializerOptions} from '../types'
import {createFlattenTableRule} from './flatten-tables'

describe(createFlattenTableRule.name, () => {
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

  function transform(html: string, options?: HtmlDeserializerOptions) {
    return htmlToBlocks(html, schema, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator: createTestKeyGenerator('k'),
      ...options,
    })
  }

  const flattenTableRule = createFlattenTableRule({
    schema,
    separator: () => ({_type: 'span', text: ' '}),
  })

  test('ordinary table', () => {
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

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual([
      'Year, ,2022',
      'Sales, ,$8,000',
      'Expenses, ,$5,000',
      'Profit, ,$3,000',
      'Year, ,2023',
      'Sales, ,$10,000',
      'Expenses, ,$6,500',
      'Profit, ,$3,500',
      'Year, ,2024',
      'Sales, ,$15,000',
      'Expenses, ,$9,000',
      'Profit, ,$6,000',
    ])
  })

  test('ordinary table without thead and tbody', () => {
    /**
     * | Year | Sales    | Expenses | Profit  |
     * | 2022 | \$8,000  | \$5,000  | \$3,000 |
     * | 2023 | \$10,000 | \$6,500  | \$3,500 |
     * | 2024 | \$15,000 | \$9,000  | \$6,000 |
     */
    const html = [
      '<table>',
      '<tr>',
      '<td>Year</td>',
      '<td>Sales</td>',
      '<td>Expenses</td>',
      '<td>Profit</td>',
      '</tr>',
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
      '</table>',
    ].join('')

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual([
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

  test('ordinary table without thead', () => {
    /**
     * | Year | Sales    | Expenses | Profit  |
     * | 2022 | \$8,000  | \$5,000  | \$3,000 |
     * | 2023 | \$10,000 | \$6,500  | \$3,500 |
     * | 2024 | \$15,000 | \$9,000  | \$6,000 |
     */
    const html = [
      '<table>',
      '<tbody>',
      '<tr>',
      '<td>Year</td>',
      '<td>Sales</td>',
      '<td>Expenses</td>',
      '<td>Profit</td>',
      '</tr>',
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

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual([
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

  test('ordinary table without tbody', () => {
    /**
     * | Year | Sales    | Expenses | Profit  |
     * | 2022 | \$8,000  | \$5,000  | \$3,000 |
     * | 2023 | \$10,000 | \$6,500  | \$3,500 |
     * | 2024 | \$15,000 | \$9,000  | \$6,000 |
     */
    const html = [
      '<table>',
      '<thead>',
      '<tr>',
      '<td>Year</td>',
      '<td>Sales</td>',
      '<td>Expenses</td>',
      '<td>Profit</td>',
      '</tr>',
      '</thead>',
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
      '</table>',
    ].join('')

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual([
      'Year, ,2022',
      'Sales, ,$8,000',
      'Expenses, ,$5,000',
      'Profit, ,$3,000',
      'Year, ,2023',
      'Sales, ,$10,000',
      'Expenses, ,$6,500',
      'Profit, ,$3,500',
      'Year, ,2024',
      'Sales, ,$15,000',
      'Expenses, ,$9,000',
      'Profit, ,$6,000',
    ])
  })

  test('multiple header rows', () => {
    /**
     * | Name       | Age   |
     * | Navn       | Alder |
     * | ---        | ---   |
     * | John Doe   | 18    |
     * | Jane Smith | 20    |
     */
    const html = [
      '<table>',
      '<thead>',
      '<tr>',
      '<th>Name</th>',
      '<th>Age</th>',
      '</tr>',
      '<tr>',
      '<th>Navn</th>',
      '<th>Alder</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td>John Doe</td>',
      '<td>18</td>',
      '</tr>',
      '<tr>',
      '<td>Jane Smith</td>',
      '<td>20</td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('')

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual([
      'Name',
      'Age',
      'Navn',
      'Alder',
      'John Doe',
      '18',
      'Jane Smith',
      '20',
    ])
  })

  test('only thead', () => {
    /**
     * | Name | John Doe |
     * | Age  | 18       |
     */
    const html = [
      '<table>',
      '<thead>',
      '<tr>',
      '<th>Name</th>',
      '<th>John Doe</th>',
      '</tr>',
      '<tr>',
      '<th>Age</th>',
      '<th>18</th>',
      '</tr>',
      '</thead>',
      '</table>',
    ].join('')

    expect(
      getTersePt({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toEqual(['Name', 'John Doe', 'Age', '18'])
  })

  describe('table with images', () => {
    /**
     * | Name       | Photo                                                          |
     * | ---        | ---                                                            |
     * | John Doe   | <img src="https://via.placeholder.com/150" alt="John Doe" />   |
     * | Jane Smith | <img src="https://via.placeholder.com/150" alt="Jane Smith" /> |
     */
    const html = [
      '<table>',
      '<thead>',
      '<tr>',
      '<th>Name</th>',
      '<th>Photo</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      '<tr>',
      '<td>John Doe</td>',
      '<td><img src="https://via.placeholder.com/150" alt="John Doe" /></td>',
      '</tr>',
      '<tr>',
      '<td>Jane Smith</td>',
      '<td><img src="https://via.placeholder.com/150" alt="Jane Smith" /></td>',
      '</tr>',
      '</tbody>',
      '</table>',
    ].join('')

    test('no image matcher', () => {
      expect(
        getTersePt({
          schema,
          value: transform(html, {
            matchers: undefined,
            rules: [flattenTableRule],
          }),
        }),
      ).toEqual(['Name, ,John Doe', 'Photo', 'Name, ,Jane Smith', 'Photo'])
    })

    test('block image matcher', () => {
      expect(
        getTersePt({
          schema,
          value: transform(html, {
            matchers: {
              image: imageMatcher,
            },
            rules: [flattenTableRule],
          }),
        }),
      ).toEqual([
        'Name, ,John Doe',
        'Photo',
        '{image}',
        'Name, ,Jane Smith',
        'Photo',
        '{image}',
      ])
    })

    test('block and inline image matcher', () => {
      expect(
        getTersePt({
          schema,
          value: transform(html, {
            matchers: {
              image: imageMatcher,
              inlineImage: inlineImageMatcher,
            },
            rules: [flattenTableRule],
          }),
        }),
      ).toEqual([
        'Name, ,John Doe',
        'Photo, ,{image}',
        'Name, ,Jane Smith',
        'Photo, ,{image}',
      ])
    })

    describe('Google Docs', () => {
      test('simple table with thead', () => {
        const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-e0aa048e-7fff-f3cb-0d6d-5e68751be0e3"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt"><colgroup><col /><col /></colgroup><thead><tr style="height:0pt"><th style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;" scope="col"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Header 1</span></p></th><th style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;" scope="col"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Header 2</span></p></th></tr></thead><tbody><tr style="height:0pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 1</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 2</span></p></td></tr></tbody></table></div></b>`

        expect(
          getTersePt({
            schema,
            value: transform(html, {
              rules: [flattenTableRule],
            }),
          }),
        ).toEqual(['Header 1, ,Cell 1', 'Header 2, ,Cell 2'])
      })
    })
  })
})
