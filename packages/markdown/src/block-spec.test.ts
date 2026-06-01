import {describe, expect, test} from 'vitest'
import {parseToBlockEvents} from './to-portable-text/parse/block-parser'
import {eventsToPortableText} from './to-portable-text/parse/events-to-portable-text'
import {
  resolveOptions,
  type ParseOptions,
} from './to-portable-text/parse/parser'

const keyGen = () => {
  let i = 0
  return () => `k${i++}`
}

const parse = (input: string, options: ParseOptions = {}) =>
  eventsToPortableText(parseToBlockEvents(input), resolveOptions(options))

describe(`${parseToBlockEvents.name} + ${eventsToPortableText.name}`, () => {
  describe('paragraph', () => {
    test('single line', () => {
      expect(parse('foo', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
      ])
    })

    test('two paragraphs separated by blank line', () => {
      expect(parse('foo\n\nbar', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ])
    })

    test('multi-line paragraph joins with newline', () => {
      expect(parse('foo\nbar', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
        },
      ])
    })
  })

  describe('heading', () => {
    test('h1', () => {
      expect(parse('# Title', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'h1',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'Title', marks: []}],
        },
      ])
    })

    test('h1 through h6', () => {
      expect(
        parse('# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6', {
          keyGenerator: keyGen(),
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'h1',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'h1', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'h2',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'h2', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'h3',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'h3', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k6',
          style: 'h4',
          markDefs: [],
          children: [{_type: 'span', _key: 'k7', text: 'h4', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k8',
          style: 'h5',
          markDefs: [],
          children: [{_type: 'span', _key: 'k9', text: 'h5', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k10',
          style: 'h6',
          markDefs: [],
          children: [{_type: 'span', _key: 'k11', text: 'h6', marks: []}],
        },
      ])
    })

    test('heading falls back to normal when style matcher returns undefined', () => {
      expect(
        parse('# foo', {
          keyGenerator: keyGen(),
          block: {h1: () => undefined},
        }),
      ).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
      ])
    })
  })

  describe('thematic_break', () => {
    test('---', () => {
      expect(parse('---', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'horizontal-rule'},
      ])
    })

    test('***', () => {
      expect(parse('***', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'horizontal-rule'},
      ])
    })

    test('___', () => {
      expect(parse('___', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'horizontal-rule'},
      ])
    })

    test('thematic_break falls back to literal text when matcher undefined', () => {
      expect(
        parse('---', {
          keyGenerator: keyGen(),
          types: {horizontalRule: () => undefined},
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '---', marks: []}],
        },
      ])
    })
  })

  describe('blockquote', () => {
    test('flat blockquote', () => {
      expect(parse('> foo', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'blockquote',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
        },
      ])
    })

    test('multi-line blockquote', () => {
      expect(parse('> foo\n> bar', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'blockquote',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo\nbar', marks: []}],
        },
      ])
    })
  })

  describe('list', () => {
    test('simple bullet list', () => {
      expect(parse('- foo', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'bullet',
          level: 1,
        },
      ])
    })

    test('simple ordered list', () => {
      expect(parse('1. foo', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('multiple items', () => {
      expect(parse('- foo\n- bar', {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          listItem: 'bullet',
          level: 1,
        },
      ])
    })
  })

  describe('code blocks', () => {
    test('fenced code with language', () => {
      expect(parse('```js\nconst foo\n```', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'code', language: 'js', code: 'const foo'},
      ])
    })

    test('fenced code without language', () => {
      expect(parse('```\nfoo\nbar\n```', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'code', code: 'foo\nbar'},
      ])
    })

    test('indented code block', () => {
      expect(parse('    foo\n    bar', {keyGenerator: keyGen()})).toEqual([
        {_key: 'k0', _type: 'code', code: 'foo\nbar'},
      ])
    })
  })

  describe('html block', () => {
    test('block HTML', () => {
      expect(
        parse('<div class="custom">Content</div>', {keyGenerator: keyGen()}),
      ).toEqual([
        {
          _key: 'k0',
          _type: 'html',
          html: '<div class="custom">Content</div>',
        },
      ])
    })
  })

  describe('lazy continuation', () => {
    test('fenced code inside list item', () => {
      const md = [
        '1. foo',
        '',
        '    ```js',
        '    const foo',
        '    ```',
        '',
        '    bar',
      ].join('\n')
      expect(parse(md, {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'number',
          level: 1,
        },
        {_key: 'k2', _type: 'code', language: 'js', code: 'const foo'},
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
          listItem: 'number',
          level: 1,
        },
      ])
    })

    test('indented code block inside list item', () => {
      const md = ['1. foo', '', '       const foo = "bar"', '', '    bar'].join(
        '\n',
      )
      expect(parse(md, {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'number',
          level: 1,
        },
        {_key: 'k2', _type: 'code', code: 'const foo = "bar"'},
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
          listItem: 'number',
          level: 1,
        },
      ])
    })
  })

  describe('tables', () => {
    test('simple table emits one table_row event per row', () => {
      const md = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      const events = parseToBlockEvents(md)
      const rowOpens = events.filter(
        (e) => e.kind === 'open' && e.spec === 'table_row',
      )
      expect(rowOpens).toHaveLength(3)
    })

    test('no table matcher emits one paragraph per cell', () => {
      const md = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      expect(parse(md, {keyGenerator: keyGen()})).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'A', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k3',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k4', text: 'B', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k7',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k8', text: '1', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k10',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k11', text: '2', marks: []}],
        },
      ])
    })
  })

  describe('event stream', () => {
    const summarize = (events: ReturnType<typeof parseToBlockEvents>) =>
      events.map((e) =>
        e.kind === 'inline_run'
          ? `text:${e.text}`
          : e.kind === 'verbatim_line'
            ? `verbatim:${e.text}`
            : `${e.kind}:${e.spec}`,
      )

    test('paragraph emits open paragraph, inline_run, close paragraph', () => {
      expect(summarize(parseToBlockEvents('foo'))).toEqual([
        'open:paragraph',
        'text:foo',
        'close:paragraph',
      ])
    })

    test('heading emits open heading, inline_run, close heading', () => {
      expect(summarize(parseToBlockEvents('# foo'))).toEqual([
        'open:heading',
        'text:foo',
        'close:heading',
      ])
    })

    test('thematic_break emits open thematic_break, close thematic_break', () => {
      expect(summarize(parseToBlockEvents('---'))).toEqual([
        'open:thematic_break',
        'close:thematic_break',
      ])
    })
  })
})
