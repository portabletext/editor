import {describe, expect, test} from 'vitest'
import {transform} from './test-utils'

describe('decorators', () => {
  test('strong', () => {
    const html = [
      `<p>foo <b>bar</b> baz</p>`,
      `<p>foo <strong>bar</strong> baz</p>`,
    ]

    expect(transform(html)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strong']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('emphasis', () => {
    const html = [`<p>foo <i>bar</i> baz</p>`, `<p>foo <em>bar</em> baz</p>`]

    expect(transform(html)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['em']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('underline', () => {
    const html = `<p>foo <u>bar</u> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['underline']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('strike-through', () => {
    const html = [
      `<p>foo <s>bar</s> baz</p>`,
      `<p>foo <strike>bar</strike> baz</p>`,
    ]

    expect(transform(html)).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strike-through']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('del', () => {
    const html = `<p>foo <del>bar</del> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strike-through']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('code', () => {
    const html = `<p>foo <code>bar</code> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['code']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('sup', () => {
    const html = `<p>foo <sup>bar</sup> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['sup']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('sub', () => {
    const html = `<p>foo <sub>bar</sub> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['sub']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('ins', () => {
    const html = `<p>foo <ins>bar</ins> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['ins']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('mark', () => {
    const html = `<p>foo <mark>bar</mark> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['mark']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('small', () => {
    const html = `<p>foo <small>bar</small> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['small']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('strong + em', () => {
    const html = `<p>foo <strong><em>bar</em></strong> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar', marks: ['strong', 'em']},
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('b + i + u', () => {
    const html = `<p>foo <b><i><u>bar</u></i></b> baz</p>`

    expect(transform([html])).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
          {
            _type: 'span',
            _key: 'k2',
            text: 'bar',
            marks: ['strong', 'em', 'underline'],
          },
          {_type: 'span', _key: 'k3', text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
