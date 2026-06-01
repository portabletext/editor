import {describe, expect, test} from 'vitest'
import {parseToBlockEvents} from './parse/block-parser'
import {eventsToPortableText} from './parse/events-to-portable-text'
import {resolveOptions} from './parse/parser'

const parse = (input: string, options = {}) =>
  eventsToPortableText(parseToBlockEvents(input), resolveOptions(options))

describe('block-parser Day 1 skeleton', () => {
  describe('paragraph', () => {
    test('single line', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      expect(parse('foo', {keyGenerator: keys})).toEqual([
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
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('foo\n\nbar', {keyGenerator: keys})
      expect(result).toHaveLength(2)
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('foo')
      expect(
        (result[1]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('bar')
    })

    test('multi-line paragraph joins with newline', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('foo\nbar', {keyGenerator: keys})
      expect(result).toHaveLength(1)
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('foo\nbar')
    })
  })

  describe('heading', () => {
    test('h1', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      expect(parse('# Title', {keyGenerator: keys})).toEqual([
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
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse(
        '# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6',
        {keyGenerator: keys},
      )
      expect(result.map((b) => (b as {style: string}).style)).toEqual([
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ])
    })

    test('heading falls back to normal when style matcher returns undefined', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('# foo', {
        keyGenerator: keys,
        block: {h1: () => undefined as unknown as string},
      })
      expect(result).toEqual([
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
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('---', {keyGenerator: keys})
      expect(result).toHaveLength(1)
      expect(result[0]?._type).toBe('horizontal-rule')
    })

    test('*** and ___', () => {
      expect(parse('***')[0]?._type).toBe('horizontal-rule')
      expect(parse('___')[0]?._type).toBe('horizontal-rule')
    })

    test('thematic_break falls back to literal text when matcher undefined', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('---', {
        keyGenerator: keys,
        types: {horizontalRule: () => undefined},
      })
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('---')
    })
  })

  describe('blockquote (Day 2)', () => {
    test('flat blockquote', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('> foo', {keyGenerator: keys})
      expect(result).toEqual([
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
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('> foo\n> bar', {keyGenerator: keys})
      expect(result).toHaveLength(1)
      expect((result[0]! as unknown as {style: string}).style).toBe(
        'blockquote',
      )
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('foo\nbar')
    })
  })

  describe('list (Day 2)', () => {
    test('simple bullet list', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('- foo', {keyGenerator: keys})
      expect(result).toEqual([
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
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('1. foo', {keyGenerator: keys})
      expect(result).toEqual([
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

    test.skip('task list (legacy expectation; corpus covers task)', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('- [x] foo', {keyGenerator: keys})
      expect(result).toEqual([
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          listItem: 'bullet',
          level: 1,
          checked: true,
        },
      ])
    })

    test('multiple items', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('- foo\n- bar', {keyGenerator: keys})
      expect(result).toHaveLength(2)
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('foo')
      expect(
        (result[1]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('bar')
    })
  })

  describe('code blocks (Day 3)', () => {
    test('fenced code with language', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('```js\nconst foo\n```', {keyGenerator: keys})
      expect(result).toHaveLength(1)
      expect((result[0] as unknown as {_type: string})._type).toBe('code')
      expect((result[0] as unknown as {code: string}).code).toBe('const foo')
      expect((result[0] as unknown as {language?: string}).language).toBe('js')
    })

    test('fenced code without language', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('```\nfoo\nbar\n```', {keyGenerator: keys})
      expect((result[0] as unknown as {code: string}).code).toBe('foo\nbar')
    })

    test('indented code block', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('    foo\n    bar', {keyGenerator: keys})
      expect(result).toHaveLength(1)
      expect((result[0] as unknown as {_type: string})._type).toBe('code')
      expect((result[0] as unknown as {code: string}).code).toBe('foo\nbar')
    })
  })

  describe('html block (Day 3)', () => {
    test('block HTML', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const result = parse('<div class="custom">Content</div>', {
        keyGenerator: keys,
      })
      expect(result).toHaveLength(1)
      expect((result[0] as unknown as {_type: string})._type).toBe('html')
      expect((result[0] as unknown as {html: string}).html).toBe(
        '<div class="custom">Content</div>',
      )
    })
  })

  describe('lazy continuation: list with code block (Day 3 ★)', () => {
    test('fenced code inside list item', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const md = [
        '1. foo',
        '',
        '    ```js',
        '    const foo',
        '    ```',
        '',
        '    bar',
      ].join('\n')
      const result = parse(md, {keyGenerator: keys})
      expect(
        result.map((r) => (r as unknown as {_type: string})._type),
      ).toEqual(['block', 'code', 'block'])
      const firstBlock = result[0] as {
        listItem?: string
        level?: number
        children: Array<{text: string}>
      }
      expect(firstBlock.listItem).toBe('number')
      expect(firstBlock.level).toBe(1)
      expect(firstBlock.children[0]!.text).toBe('foo')
      expect((result[1] as unknown as {code: string}).code).toBe('const foo')
      const lastBlock = result[2] as {
        listItem?: string
        level?: number
        children: Array<{text: string}>
      }
      expect(lastBlock.listItem).toBe('number')
      expect(lastBlock.children[0]!.text).toBe('bar')
    })

    test('indented code block inside list item', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const md = ['1. foo', '', '       const foo = "bar"', '', '    bar'].join(
        '\n',
      )
      const result = parse(md, {keyGenerator: keys})
      expect(
        result.map((r) => (r as unknown as {_type: string})._type),
      ).toEqual(['block', 'code', 'block'])
    })
  })

  describe('tables (Day 4)', () => {
    test('simple table emits table_row events', () => {
      const md = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      const events = parseToBlockEvents(md)
      const rowOpens = events.filter(
        (e) => e.kind === 'open' && (e as {spec: string}).spec === 'table_row',
      )
      expect(rowOpens).toHaveLength(3)
    })

    test('no table matcher emits cell-per-paragraph', () => {
      const keys = (() => {
        let i = 0
        return () => `k${i++}`
      })()
      const md = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n')
      const result = parse(md, {keyGenerator: keys})
      // 4 cells = 4 paragraphs
      expect(result).toHaveLength(4)
      expect(
        (result[0]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('A')
      expect(
        (result[1]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('B')
      expect(
        (result[2]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('1')
      expect(
        (result[3]! as unknown as {children: Array<{text: string}>})
          .children[0]!.text,
      ).toBe('2')
    })
  })
  describe('event stream', () => {
    test('paragraph emits +para inline_run -para', () => {
      const events = parseToBlockEvents('foo')
      expect(
        events.map((e) =>
          e.kind === 'inline_run'
            ? `text:${e.text}`
            : e.kind === 'verbatim_line'
              ? `verbatim:${e.text}`
              : `${e.kind}:${e.spec}`,
        ),
      ).toEqual(['open:paragraph', 'text:foo', 'close:paragraph'])
    })

    test('heading emits +heading inline_run -heading', () => {
      const events = parseToBlockEvents('# foo')
      expect(
        events.map((e) =>
          e.kind === 'inline_run'
            ? `text:${e.text}`
            : e.kind === 'verbatim_line'
              ? `verbatim:${e.text}`
              : `${e.kind}:${e.spec}`,
        ),
      ).toEqual(['open:heading', 'text:foo', 'close:heading'])
    })

    test('thematic_break emits +tb -tb', () => {
      const events = parseToBlockEvents('---')
      expect(
        events.map((e) =>
          e.kind === 'inline_run'
            ? `text:${e.text}`
            : e.kind === 'verbatim_line'
              ? `verbatim:${e.text}`
              : `${e.kind}:${e.spec}`,
        ),
      ).toEqual(['open:thematic_break', 'close:thematic_break'])
    })
  })
})
