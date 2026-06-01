import {describe, expect, test} from 'vitest'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

const keyGen = () => {
  let i = 0
  return () => `k${i++}`
}

describe(`${markdownToPortableText.name} (GFM autolinks)`, () => {
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
        markDefs: [{_key: 'k2', _type: 'link', href: 'https://example.com'}],
      },
    ])
  })

  test('www. prefix linkifies with implicit http://', () => {
    expect(
      markdownToPortableText('See www.example.com', {keyGenerator: keyGen()}),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: 'See ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'www.example.com',
            marks: ['k2'],
          },
        ],
        markDefs: [{_key: 'k2', _type: 'link', href: 'http://www.example.com'}],
      },
    ])
  })

  test('email address becomes a mailto link', () => {
    expect(
      markdownToPortableText('Email hello@example.com here', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: 'Email ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'hello@example.com',
            marks: ['k2'],
          },
          {_type: 'span', _key: 'k4', text: ' here', marks: []},
        ],
        markDefs: [
          {_key: 'k2', _type: 'link', href: 'mailto:hello@example.com'},
        ],
      },
    ])
  })

  test('trailing punctuation is excluded from the URL', () => {
    expect(
      markdownToPortableText('Visit https://example.com.', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: 'Visit ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'https://example.com',
            marks: ['k2'],
          },
          {_type: 'span', _key: 'k4', text: '.', marks: []},
        ],
        markDefs: [{_key: 'k2', _type: 'link', href: 'https://example.com'}],
      },
    ])
  })

  test('does not linkify mid-word (no left boundary)', () => {
    expect(
      markdownToPortableText('foohttps://example.com', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foohttps://example.com',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ])
  })

  test('does not linkify inside a code span', () => {
    expect(
      markdownToPortableText('Try `https://example.com` here', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: 'Try ', marks: []},
          {
            _type: 'span',
            _key: 'k2',
            text: 'https://example.com',
            marks: ['code'],
          },
          {_type: 'span', _key: 'k3', text: ' here', marks: []},
        ],
        markDefs: [],
      },
    ])
  })

  test('unmatched trailing paren is dropped from the URL', () => {
    expect(
      markdownToPortableText('(see https://example.com)', {
        keyGenerator: keyGen(),
      }),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: '(see ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'https://example.com',
            marks: ['k2'],
          },
          {_type: 'span', _key: 'k4', text: ')', marks: []},
        ],
        markDefs: [{_key: 'k2', _type: 'link', href: 'https://example.com'}],
      },
    ])
  })

  test('balanced parens are kept inside the URL', () => {
    expect(
      markdownToPortableText(
        'See https://en.wikipedia.org/wiki/Markdown_(language) today',
        {keyGenerator: keyGen()},
      ),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [
          {_type: 'span', _key: 'k1', text: 'See ', marks: []},
          {
            _type: 'span',
            _key: 'k3',
            text: 'https://en.wikipedia.org/wiki/Markdown_(language)',
            marks: ['k2'],
          },
          {_type: 'span', _key: 'k4', text: ' today', marks: []},
        ],
        markDefs: [
          {
            _key: 'k2',
            _type: 'link',
            href: 'https://en.wikipedia.org/wiki/Markdown_(language)',
          },
        ],
      },
    ])
  })
})
