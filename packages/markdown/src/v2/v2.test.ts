import {describe, expect, test} from 'vitest'
import {markdownToPortableTextV2, portableTextToMarkdownV2} from './index'

// Deterministic key generator so output is comparable.
let counter = 0
const keyGenerator = () => `k${counter++}`
const resetKeys = () => {
  counter = 0
}

describe('markdownToPortableTextV2 (spike)', () => {
  test('empty string', () => {
    resetKeys()
    expect(markdownToPortableTextV2('', {keyGenerator})).toEqual([])
  })

  test('single paragraph', () => {
    resetKeys()
    expect(markdownToPortableTextV2('hello world', {keyGenerator})).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        children: [{_type: 'span', _key: 'k1', text: 'hello world', marks: []}],
        markDefs: [],
      },
    ])
  })

  test('heading h1', () => {
    resetKeys()
    expect(markdownToPortableTextV2('# Title', {keyGenerator})).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        children: [{_type: 'span', _key: 'k1', text: 'Title', marks: []}],
        markDefs: [],
      },
    ])
  })

  test('strong + em', () => {
    resetKeys()
    const result = markdownToPortableTextV2('**bold** and _italic_', {
      keyGenerator,
    })
    expect(result).toEqual([
      {
        _type: 'block',
        _key: expect.any(String),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: expect.any(String),
            text: 'bold',
            marks: ['strong'],
          },
          {_type: 'span', _key: expect.any(String), text: ' and ', marks: []},
          {
            _type: 'span',
            _key: expect.any(String),
            text: 'italic',
            marks: ['em'],
          },
        ],
        markDefs: [],
      },
    ])
  })

  test('inline code', () => {
    resetKeys()
    const result = markdownToPortableTextV2('use \`foo()\`', {keyGenerator})
    expect((result[0] as {children: Array<unknown>}).children).toEqual([
      {_type: 'span', _key: expect.any(String), text: 'use ', marks: []},
      {_type: 'span', _key: expect.any(String), text: 'foo()', marks: ['code']},
    ])
  })

  test('link', () => {
    resetKeys()
    const result = markdownToPortableTextV2('[click](https://example.com)', {
      keyGenerator,
    }) as Array<{
      children: Array<{text: string; marks: Array<string>}>
      markDefs: Array<{_type: string; href: string; _key: string}>
    }>
    expect(result[0]?.markDefs[0]).toEqual({
      _type: 'link',
      _key: expect.any(String),
      href: 'https://example.com',
    })
    expect(result[0]?.children[0]?.text).toBe('click')
    expect(result[0]?.children[0]?.marks).toHaveLength(1)
  })

  test('thematic break', () => {
    resetKeys()
    expect(markdownToPortableTextV2('---', {keyGenerator})).toEqual([
      {_type: 'horizontal-rule', _key: 'k0'},
    ])
  })

  test('fenced code block', () => {
    resetKeys()
    expect(
      markdownToPortableTextV2('\`\`\`ts\nconst x = 1\n\`\`\`', {keyGenerator}),
    ).toEqual([
      {_type: 'code', _key: 'k0', language: 'ts', code: 'const x = 1'},
    ])
  })

  test('blockquote (flat path)', () => {
    resetKeys()
    expect(markdownToPortableTextV2('> hi', {keyGenerator})).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'blockquote',
        children: [{_type: 'span', _key: 'k1', text: 'hi', marks: []}],
        markDefs: [],
      },
    ])
  })

  test('bullet list', () => {
    resetKeys()
    const result = markdownToPortableTextV2('- one\n- two', {
      keyGenerator,
    }) as Array<{
      listItem?: string
      level?: number
      children: Array<{text: string}>
    }>
    expect(result).toHaveLength(2)
    expect(result[0]?.listItem).toBe('bullet')
    expect(result[0]?.level).toBe(1)
    expect(result[0]?.children[0]?.text).toBe('one')
    expect(result[1]?.children[0]?.text).toBe('two')
  })

  test('nested bullet list', () => {
    resetKeys()
    const result = markdownToPortableTextV2('- one\n  - nested', {
      keyGenerator,
    }) as Array<{
      level?: number
      children: Array<{text: string}>
    }>
    expect(result[0]?.level).toBe(1)
    expect(result[1]?.level).toBe(2)
    expect(result[1]?.children[0]?.text).toBe('nested')
  })
})

describe('portableTextToMarkdownV2 (spike)', () => {
  test('empty', () => {
    expect(portableTextToMarkdownV2([])).toBe('')
  })

  test('paragraph', () => {
    expect(
      portableTextToMarkdownV2([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [{_type: 'span', _key: 'k0', text: 'hello', marks: []}],
          markDefs: [],
        },
      ]),
    ).toBe('hello')
  })

  test('heading', () => {
    expect(
      portableTextToMarkdownV2([
        {
          _type: 'block',
          _key: 'k1',
          style: 'h2',
          children: [{_type: 'span', _key: 'k0', text: 'Title', marks: []}],
          markDefs: [],
        },
      ]),
    ).toBe('## Title')
  })

  test('strong + em', () => {
    expect(
      portableTextToMarkdownV2([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [
            {_type: 'span', _key: 'a', text: 'bold', marks: ['strong']},
            {_type: 'span', _key: 'b', text: ' ', marks: []},
            {_type: 'span', _key: 'c', text: 'italic', marks: ['em']},
          ],
          markDefs: [],
        },
      ]),
    ).toBe('**bold** _italic_')
  })

  test('link', () => {
    expect(
      portableTextToMarkdownV2([
        {
          _type: 'block',
          _key: 'k1',
          style: 'normal',
          children: [
            {_type: 'span', _key: 'a', text: 'click', marks: ['linkkey']},
          ],
          markDefs: [
            {_type: 'link', _key: 'linkkey', href: 'https://example.com'},
          ],
        },
      ]),
    ).toBe('[click](https://example.com)')
  })

  test('fenced code', () => {
    expect(
      portableTextToMarkdownV2([
        {
          _type: 'code',
          _key: 'k0',
          language: 'ts',
          code: 'const x = 1',
        } as never,
      ]),
    ).toBe('\`\`\`ts\nconst x = 1\n\`\`\`')
  })

  test('hr', () => {
    expect(
      portableTextToMarkdownV2([
        {_type: 'horizontal-rule', _key: 'k0'} as never,
      ]),
    ).toBe('---')
  })
})

describe('round-trip (spike)', () => {
  test('paragraph', () => {
    const md = 'hello world'
    expect(portableTextToMarkdownV2(markdownToPortableTextV2(md))).toBe(md)
  })

  test('heading', () => {
    const md = '## A title'
    expect(portableTextToMarkdownV2(markdownToPortableTextV2(md))).toBe(md)
  })

  test('strong + em', () => {
    const md = '**bold** and _italic_'
    expect(portableTextToMarkdownV2(markdownToPortableTextV2(md))).toBe(md)
  })

  test('link', () => {
    const md = '[click](https://example.com)'
    expect(portableTextToMarkdownV2(markdownToPortableTextV2(md))).toBe(md)
  })

  test('mixed document', () => {
    const md = [
      '# Title',
      '',
      'A paragraph with **bold** and _italic_ and a [link](https://example.com).',
      '',
      '- one',
      '- two',
      '',
      '\`\`\`ts',
      'const x = 1',
      '\`\`\`',
      '',
      '> a quote',
      '',
      '---',
    ].join('\n')
    const pt = markdownToPortableTextV2(md)
    const back = portableTextToMarkdownV2(pt)
    expect(back).toBe(md)
  })
})
