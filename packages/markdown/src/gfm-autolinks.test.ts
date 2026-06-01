import {describe, expect, test} from 'vitest'
import {markdownToPortableText} from './markdown-to-portable-text'

const keyGen = () => {
  let i = 0
  return () => `k${i++}`
}

describe('GFM autolinks', () => {
  test('bare https URL becomes a link', () => {
    expect(
      markdownToPortableText('Visit https://example.com today', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [{_type: 'link', _key: 'k2', href: 'https://example.com'}],
        children: [
          {_type: 'span', _key: 'k1', text: 'Visit ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'https://example.com',
            marks: ['k2'],
          },
          {_type: 'span', _key: 'k4', text: ' today', marks: []},
        ],
      },
    ])
  })

  test('www. prefix linkifies with implicit http://', () => {
    const result = markdownToPortableText('See www.example.com', {
      keyGenerator: keyGen(),
    })
    expect(
      (result[0] as unknown as {markDefs: Array<{href: string}>}).markDefs[0]?.href,
    ).toBe('http://www.example.com')
  })

  test('email address becomes mailto link', () => {
    const result = markdownToPortableText('Email hello@example.com here', {
      keyGenerator: keyGen(),
    })
    expect(
      (result[0] as unknown as {markDefs: Array<{href: string}>}).markDefs[0]?.href,
    ).toBe('mailto:hello@example.com')
  })

  test('trailing punctuation excluded from URL', () => {
    const result = markdownToPortableText('Visit https://example.com.', {
      keyGenerator: keyGen(),
    })
    const spans = (result[0] as unknown as {children: Array<{text: string}>}).children
    expect(spans.map((s) => s.text)).toEqual([
      'Visit ',
      'https://example.com',
      '.',
    ])
  })

  test('does not linkify mid-word', () => {
    const result = markdownToPortableText('foohttps://example.com', {
      keyGenerator: keyGen(),
    })
    // No left boundary; the URL is treated as plain text.
    expect((result[0] as unknown as {markDefs: Array<unknown>}).markDefs).toEqual([])
  })

  test('does not linkify inside a code span', () => {
    const result = markdownToPortableText('Try `https://example.com` here', {
      keyGenerator: keyGen(),
    })
    expect((result[0] as unknown as {markDefs: Array<unknown>}).markDefs).toEqual([])
  })

  test('unmatched trailing paren dropped from URL', () => {
    const result = markdownToPortableText('(see https://example.com)', {
      keyGenerator: keyGen(),
    })
    const spans = (result[0] as unknown as {children: Array<{text: string}>}).children
    expect(spans.map((s) => s.text)).toEqual([
      '(see ',
      'https://example.com',
      ')',
    ])
  })

  test('balanced paren kept inside URL', () => {
    const result = markdownToPortableText(
      'See https://en.wikipedia.org/wiki/Markdown_(language) today',
      {keyGenerator: keyGen()},
    )
    const linked = (
      result[0] as {children: Array<{text: string; marks: string[]}>}
    ).children.find((s) => s.marks.length > 0)
    expect(linked?.text).toBe(
      'https://en.wikipedia.org/wiki/Markdown_(language)',
    )
  })
})
