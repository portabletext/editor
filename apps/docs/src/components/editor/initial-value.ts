import {keyGenerator, type PortableTextBlock} from '@portabletext/editor'

const studioLinkKey = keyGenerator()
const canvasLinkKey = keyGenerator()
const getStartedLinkKey = keyGenerator()
const sanityLinkKey = keyGenerator()

export const initialValue: Array<PortableTextBlock> = [
  {
    _type: 'image',
    _key: keyGenerator(),
    src: '/portable-text-logo.png',
    alt: 'Portable Text Editor logo',
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'h1',
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Schema-Driven Rich Text Editing',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Schema in. JSON out. Render anywhere.',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Proven', marks: ['strong']},
      {_type: 'span', _key: keyGenerator(), text: ': Powers '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Sanity Studio',
        marks: [studioLinkKey],
      },
      {_type: 'span', _key: keyGenerator(), text: ' and '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Canvas',
        marks: [canvasLinkKey],
      },
    ],
    markDefs: [
      {
        _type: 'link',
        _key: studioLinkKey,
        href: 'https://www.sanity.io/studio',
      },
      {
        _type: 'link',
        _key: canvasLinkKey,
        href: 'https://www.sanity.io/canvas',
      },
    ],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Extensible',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ': Drop-in plugins, custom blocks, inline objects, and annotations',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Predictable',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ': No HTML to sanitize, just queryable data you can render anywhere',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Reliable',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ': Sensible defaults backed by hundreds of test cases',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Inline objects like '},
      {_type: 'stock-ticker', _key: keyGenerator(), symbol: 'AAPL'},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ' live right in your content.',
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    children: [
      {_type: 'span', _key: keyGenerator(), text: '→ '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Build your first editor in 5 minutes',
        marks: [getStartedLinkKey],
      },
    ],
    markDefs: [
      {_type: 'link', _key: getStartedLinkKey, href: '/getting-started/'},
    ],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'blockquote',
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Open source from '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Sanity',
        marks: [sanityLinkKey],
      },
      {_type: 'span', _key: keyGenerator(), text: '. MIT licensed.'},
    ],
    markDefs: [{_type: 'link', _key: sanityLinkKey, href: 'https://sanity.io'}],
  },
]
