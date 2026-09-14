import type {PortableTextBlock} from '@portabletext/editor'
import {createKeyGenerator} from '../key-generator'

/**
 * A deterministic starting document exercising one of every construct
 * the markdown loop needs to prove out: plain marks, a link annotation,
 * inline objects, a list, a blockquote, block objects that only
 * round-trip as `json:object` carriers (fact-box, image), and block
 * objects that serialize natively (code, table, callout, horizontal-rule).
 */
export function createMarkdownLoopSeed(): Array<PortableTextBlock> {
  const key = createKeyGenerator('seed')

  const linkKey = key()
  const heading: PortableTextBlock = {
    _type: 'block',
    _key: key(),
    style: 'h1',
    children: [
      {_type: 'span', _key: key(), text: 'Q3 release notes', marks: []},
    ],
    markDefs: [],
  }
  const paragraph: PortableTextBlock = {
    _type: 'block',
    _key: key(),
    style: 'normal',
    alignment: 'center',
    children: [
      {_type: 'span', _key: key(), text: 'The editor now ships ', marks: []},
      {_type: 'span', _key: key(), text: 'fast', marks: ['strong']},
      {_type: 'span', _key: key(), text: ' and ', marks: []},
      {_type: 'span', _key: key(), text: 'reliable', marks: ['em']},
      {
        _type: 'span',
        _key: key(),
        text: ' markdown interop for agents. ',
        marks: [],
      },
      {_type: 'stock-ticker', _key: key(), symbol: 'AAPL'},
      {
        _type: 'span',
        _key: key(),
        text: ' tracks the ticker inline, and ',
        marks: [],
      },
      {
        _type: 'mention',
        _key: key(),
        userId: '1',
        name: 'Alice Smith',
        username: 'alice',
      },
      {
        _type: 'span',
        _key: key(),
        text: ' keeps an eye on the copy. See the ',
        marks: [],
      },
      {_type: 'span', _key: key(), text: 'docs site', marks: [linkKey]},
      {_type: 'span', _key: key(), text: ' for the full contract.', marks: []},
    ],
    markDefs: [
      {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
    ],
  }
  const listItemOne: PortableTextBlock = {
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {_type: 'span', _key: key(), text: 'Key-preserving edits', marks: []},
    ],
    markDefs: [],
  }
  const listItemTwo: PortableTextBlock = {
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {_type: 'span', _key: key(), text: 'Round-trip fidelity', marks: []},
    ],
    markDefs: [],
  }
  const quote: PortableTextBlock = {
    _type: 'block',
    _key: key(),
    style: 'blockquote',
    children: [
      {
        _type: 'span',
        _key: key(),
        text: 'Markdown is the shape agents already speak.',
        marks: [],
      },
    ],
    markDefs: [],
  }
  const code: PortableTextBlock = {
    _type: 'code',
    _key: key(),
    language: 'ts',
    code: 'const stored = markdownToPortableText(markdown, {schema})\napplyMarkdownEdit(stored, edited, {schema})',
    filename: 'edit-loop.ts',
  }
  const horizontalRule: PortableTextBlock = {
    _type: 'horizontal-rule',
    _key: key(),
  }
  const factBox: PortableTextBlock = {
    _type: 'fact-box',
    _key: key(),
    content: [
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: key(),
            text: 'Custom objects round-trip as json:object carriers.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  }
  const image: PortableTextBlock = {
    _type: 'image',
    _key: key(),
    src: 'https://portabletext.org/img/logo.svg',
    alt: 'Portable Text logo',
  }
  const cell = (text: string) => ({
    _type: 'cell',
    _key: key(),
    value: [
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        children: [{_type: 'span', _key: key(), text, marks: []}],
        markDefs: [],
      },
    ],
  })
  const table: PortableTextBlock = {
    _type: 'table',
    _key: key(),
    headerRows: 1,
    rows: [
      {
        _type: 'row',
        _key: key(),
        cells: [cell('Feature'), cell('Status')],
      },
      {
        _type: 'row',
        _key: key(),
        cells: [cell('Markdown loop'), cell('Shipped')],
      },
    ],
  }
  const callout: PortableTextBlock = {
    _type: 'callout',
    _key: key(),
    tone: 'note',
    content: [
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: key(),
            text: 'Callouts and tables now round-trip natively.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  }

  return [
    heading,
    paragraph,
    listItemOne,
    listItemTwo,
    quote,
    code,
    factBox,
    image,
    table,
    callout,
    horizontalRule,
  ]
}
