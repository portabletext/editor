import type {PortableTextBlock} from '@portabletext/editor'
import {createKeyGenerator} from '../key-generator'

/**
 * A deterministic starting document exercising one of every construct
 * the markdown loop needs to prove out: plain marks, a link annotation,
 * inline objects, a list, a blockquote, and block objects that only
 * round-trip as `json:object` carriers (code-block, fact-box, image).
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
  const codeBlock: PortableTextBlock = {
    _type: 'code-block',
    _key: key(),
    lines: [
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: key(),
            text: 'applyMarkdownEdit(stored, edited, {schema})',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
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

  return [
    heading,
    paragraph,
    listItemOne,
    listItemTwo,
    quote,
    codeBlock,
    factBox,
    image,
  ]
}
