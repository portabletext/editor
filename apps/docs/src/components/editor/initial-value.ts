import {keyGenerator, type PortableTextBlock} from '@portabletext/editor'

const getStartedLinkKey = keyGenerator()
const playgroundLinkKey = keyGenerator()
const sanityLinkKey = keyGenerator()

export const initialValue: Array<PortableTextBlock> = [
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'h1',
    children: [
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Portable Text Editor',
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
        text: 'Build ',
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'powerful',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ' content editing experiences for your applications. Portable Text Editor gives developers ',
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'complete control',
        marks: ['em'],
      },
      {
        _type: 'span',
        _key: keyGenerator(),
        text: ' over styling, formatting, and content structure.',
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
        text: 'Get Started →',
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
    style: 'normal',
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Or visit the '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'playground',
        marks: [playgroundLinkKey],
      },
    ],
    markDefs: [
      {
        _type: 'link',
        _key: playgroundLinkKey,
        href: 'https://playground.portabletext.org/',
      },
    ],
  },
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'blockquote',
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Created by the team at '},
      {
        _type: 'span',
        _key: keyGenerator(),
        text: 'Sanity',
        marks: [sanityLinkKey],
      },
    ],
    markDefs: [{_type: 'link', _key: sanityLinkKey, href: 'https://sanity.io'}],
  },
  {
    _type: 'image',
    _key: keyGenerator(),
    src: '/portable-text-logo.png',
    alt: 'Portable Text Editor logo',
  },
]
