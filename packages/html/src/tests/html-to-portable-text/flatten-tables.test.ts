import {compileSchema, defineSchema} from '@portabletext/schema'
import {toTextspec} from '@portabletext/textspec'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../html-to-portable-text'
import type {ObjectMatcher} from '../../matchers'
import {createFlattenTableRule} from '../../rules/_exports/index'

describe(createFlattenTableRule.name, () => {
  const imageMatcher: ObjectMatcher<{src?: string; alt?: string}> = ({
    context,
    value,
    isInline,
  }) => {
    const collection = isInline
      ? context.schema.inlineObjects
      : context.schema.blockObjects

    if (!collection.some((obj) => obj.name === 'image')) {
      return undefined
    }

    return {
      _type: 'image',
      _key: context.keyGenerator(),
      ...(value.src ? {src: value.src} : {}),
      ...(value.alt ? {alt: value.alt} : {}),
    }
  }

  const schema = compileSchema(
    defineSchema({
      blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
      inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    }),
  )

  const blockOnlySchema = compileSchema(
    defineSchema({
      blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    }),
  )

  let keyCounter: number

  function transform(
    html: string,
    options?: {
      schema?: ReturnType<typeof compileSchema>
      types?: {image?: ObjectMatcher<{src?: string; alt?: string}>}
      rules?: Parameters<typeof htmlToPortableText>[1] extends
        | {rules?: infer R}
        | undefined
        ? R
        : never
    },
  ) {
    keyCounter = 0
    return htmlToPortableText(html, {
      schema: options?.schema ?? schema,
      keyGenerator: () => `k${keyCounter++}`,
      parseHtml: (h) => new JSDOM(h).window.document,
      types: options?.types,
      rules: options?.rules,
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Year 2022',
        'P: Sales $8,000',
        'P: Expenses $5,000',
        'P: Profit $3,000',
        'P: Year 2023',
        'P: Sales $10,000',
        'P: Expenses $6,500',
        'P: Profit $3,500',
        'P: Year 2024',
        'P: Sales $15,000',
        'P: Expenses $9,000',
        'P: Profit $6,000',
      ].join('\n'),
    )
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Year',
        'P: Sales',
        'P: Expenses',
        'P: Profit',
        'P: 2022',
        'P: $8,000',
        'P: $5,000',
        'P: $3,000',
        'P: 2023',
        'P: $10,000',
        'P: $6,500',
        'P: $3,500',
        'P: 2024',
        'P: $15,000',
        'P: $9,000',
        'P: $6,000',
      ].join('\n'),
    )
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Year',
        'P: Sales',
        'P: Expenses',
        'P: Profit',
        'P: 2022',
        'P: $8,000',
        'P: $5,000',
        'P: $3,000',
        'P: 2023',
        'P: $10,000',
        'P: $6,500',
        'P: $3,500',
        'P: 2024',
        'P: $15,000',
        'P: $9,000',
        'P: $6,000',
      ].join('\n'),
    )
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Year 2022',
        'P: Sales $8,000',
        'P: Expenses $5,000',
        'P: Profit $3,000',
        'P: Year 2023',
        'P: Sales $10,000',
        'P: Expenses $6,500',
        'P: Profit $3,500',
        'P: Year 2024',
        'P: Sales $15,000',
        'P: Expenses $9,000',
        'P: Profit $6,000',
      ].join('\n'),
    )
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Name',
        'P: Age',
        'P: Navn',
        'P: Alder',
        'P: John Doe',
        'P: 18',
        'P: Jane Smith',
        'P: 20',
      ].join('\n'),
    )
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
      toTextspec({
        schema,
        value: transform(html, {
          rules: [flattenTableRule],
        }),
      }),
    ).toBe(
      [
        'P: Name',
        'P: John Doe',
        'P: Age',
        'P: 18',
      ].join('\n'),
    )
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
        toTextspec({
          schema,
          value: transform(html, {
            rules: [flattenTableRule],
          }),
        }),
      ).toBe(
        [
          'P: Name John Doe',
          'P: Photo',
          'P: Name Jane Smith',
          'P: Photo',
        ].join('\n'),
      )
    })

    test('block-only schema: images become blocks', () => {
      expect(
        toTextspec({
          schema: blockOnlySchema,
          value: transform(html, {
            schema: blockOnlySchema,
            types: {image: imageMatcher},
            rules: [flattenTableRule],
          }),
        }),
      ).toBe(
        [
          'P: Name John Doe',
          'P: Photo',
          '{IMAGE}',
          'P: Name Jane Smith',
          'P: Photo',
          '{IMAGE}',
        ].join('\n'),
      )
    })

    test('block and inline schema: images become inline', () => {
      expect(
        toTextspec({
          schema,
          value: transform(html, {
            types: {image: imageMatcher},
            rules: [flattenTableRule],
          }),
        }),
      ).toBe(
        [
          'P: Name John Doe',
          'P: Photo {image}',
          'P: Name Jane Smith',
          'P: Photo {image}',
        ].join('\n'),
      )
    })

    describe('Google Docs', () => {
      test('simple table with thead', () => {
        const html = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-e0aa048e-7fff-f3cb-0d6d-5e68751be0e3"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt"><colgroup><col /><col /></colgroup><thead><tr style="height:0pt"><th style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;" scope="col"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Header 1</span></p></th><th style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;" scope="col"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Header 2</span></p></th></tr></thead><tbody><tr style="height:0pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 1</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 2</span></p></td></tr></tbody></table></div></b>`

        expect(
          toTextspec({
            schema,
            value: transform(html, {
              rules: [flattenTableRule],
            }),
          }),
        ).toBe(
          [
            'P: Header 1 Cell 1',
            'P: Header 2 Cell 2',
          ].join('\n'),
        )
      })
    })
  })
})
