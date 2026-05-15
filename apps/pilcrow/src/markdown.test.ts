import {markdownToPortableText} from '@portabletext/markdown'
import {describe, expect, test} from 'vitest'
import {foldToContainers, pilcrowMatchers} from './markdown'

let kid = 0
const keyGenerator = () => `k${kid++}`

function parse(markdown: string) {
  kid = 0
  return foldToContainers(
    markdownToPortableText(markdown, {keyGenerator, types: pilcrowMatchers}),
    keyGenerator,
  )
}

describe(foldToContainers.name, () => {
  test('passes a paragraph through untouched', () => {
    expect(parse('A paragraph.')).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'A paragraph.', marks: []},
        ],
      },
    ])
  })

  test('passes two headings through untouched', () => {
    expect(parse('# H1\n\n## H2')).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'H1', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'h2',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'H2', marks: []}],
      },
    ])
  })

  test('folds consecutive bullet list-items into a list container', () => {
    expect(parse('- one\n- two')).toEqual([
      {
        _type: 'list',
        _key: 'k6',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'k4',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k1', text: 'one', marks: []}],
              },
            ],
          },
          {
            _type: 'list-item',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'two', marks: []}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('folds ordered list-items', () => {
    expect(parse('1. one\n2. two')).toEqual([
      {
        _type: 'list',
        _key: 'k6',
        kind: 'number',
        items: [
          {
            _type: 'list-item',
            _key: 'k4',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k1', text: 'one', marks: []}],
              },
            ],
          },
          {
            _type: 'list-item',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'two', marks: []}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('folds task list-items with checked on the item only, not the inner block', () => {
    expect(parse('- [ ] todo\n- [x] done')).toEqual([
      {
        _type: 'list',
        _key: 'k6',
        kind: 'task',
        items: [
          {
            _type: 'list-item',
            _key: 'k4',
            checked: false,
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k1', text: 'todo', marks: []},
                ],
              },
            ],
          },
          {
            _type: 'list-item',
            _key: 'k5',
            checked: true,
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k3', text: 'done', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('starts a new list when kind changes', () => {
    expect(parse('- one\n\n1. two')).toEqual([
      {
        _type: 'list',
        _key: 'k5',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'k4',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k1', text: 'one', marks: []}],
              },
            ],
          },
        ],
      },
      {
        _type: 'list',
        _key: 'k7',
        kind: 'number',
        items: [
          {
            _type: 'list-item',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'two', marks: []}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('keeps paragraphs separate from lists', () => {
    expect(parse('Para\n\n- one\n\nAfter')).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'Para', marks: []}],
      },
      {
        _type: 'list',
        _key: 'k7',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'one', marks: []}],
              },
            ],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'After', marks: []}],
      },
    ])
  })

  test('folds blockquote-style blocks into a blockquote container and resets inner style', () => {
    expect(parse('> One\n> Two')).toEqual([
      {
        _type: 'blockquote',
        _key: 'k2',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'One\nTwo', marks: []},
            ],
          },
        ],
      },
    ])
  })

  test('starts a new blockquote when separated by a paragraph', () => {
    expect(parse('> One\n\nPara\n\n> Two')).toEqual([
      {
        _type: 'blockquote',
        _key: 'k6',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'One', marks: []}],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'Para', marks: []}],
      },
      {
        _type: 'blockquote',
        _key: 'k7',
        content: [
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'Two', marks: []}],
          },
        ],
      },
    ])
  })

  test('passes a callout through unchanged', () => {
    expect(parse('> [!NOTE]\n> body')).toEqual([
      {
        _type: 'callout',
        _key: 'k2',
        tone: 'note',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'body', marks: []}],
          },
        ],
      },
    ])
  })

  test('passes a code-block through unchanged', () => {
    expect(parse('```js\nconst x = 1\n```')).toEqual([
      {
        _type: 'code-block',
        _key: 'k2',
        language: 'js',
        lines: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'const x = 1', marks: []},
            ],
          },
        ],
      },
    ])
  })

  test('passes a horizontal-rule through unchanged', () => {
    expect(parse('---')).toEqual([{_type: 'horizontal-rule', _key: 'k0'}])
  })

  test('passes an image through unchanged', () => {
    expect(parse('![alt](http://x/y.png)')).toEqual([
      {
        _type: 'image',
        _key: 'k1',
        src: 'http://x/y.png',
        alt: 'alt',
      },
    ])
  })
})
