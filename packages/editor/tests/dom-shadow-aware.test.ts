import {afterEach, describe, expect, test} from 'vitest'
import {
  closestShadowAware,
  containsShadowAware,
} from '../src/engine/dom/utils/dom'

afterEach(() => {
  document.body.innerHTML = ''
})

describe(containsShadowAware.name, () => {
  test('finds a descendant', () => {
    document.body.innerHTML = '<div id="foo"><span id="bar"></span></div>'

    expect(
      containsShadowAware(
        document.getElementById('foo'),
        document.getElementById('bar'),
      ),
    ).toBe(true)
  })

  test('rejects an unrelated node', () => {
    document.body.innerHTML = '<div id="foo"></div><span id="bar"></span>'

    expect(
      containsShadowAware(
        document.getElementById('foo'),
        document.getElementById('bar'),
      ),
    ).toBe(false)
  })

  test('crosses a shadow boundary', () => {
    document.body.innerHTML = '<div id="foo"><div id="bar"></div></div>'
    const shadowRoot = document
      .getElementById('bar')!
      .attachShadow({mode: 'open'})
    const child = document.createElement('span')
    shadowRoot.appendChild(child)

    expect(containsShadowAware(document.getElementById('foo'), child)).toBe(
      true,
    )
  })

  test('rejects a node in a form owning a control named "host"', () => {
    document.body.innerHTML =
      '<form><input id="host" /><input id="foo" /></form>'

    expect(
      containsShadowAware(
        document.createElement('span'),
        document.getElementById('foo'),
      ),
    ).toBe(false)
  })
})

describe(closestShadowAware.name, () => {
  test('finds a matching ancestor', () => {
    document.body.innerHTML = '<div class="foo"><span id="bar"></span></div>'

    expect(closestShadowAware(document.getElementById('bar'), '.foo')).toBe(
      document.querySelector('.foo'),
    )
  })

  test('crosses a shadow boundary', () => {
    document.body.innerHTML = '<div class="foo"><div id="bar"></div></div>'
    const shadowRoot = document
      .getElementById('bar')!
      .attachShadow({mode: 'open'})
    const child = document.createElement('span')
    shadowRoot.appendChild(child)

    expect(closestShadowAware(child, '.foo')).toBe(
      document.querySelector('.foo'),
    )
  })

  test('returns null from a form owning a control named "host"', () => {
    document.body.innerHTML =
      '<form><input id="host" /><input id="foo" /></form>'

    expect(closestShadowAware(document.getElementById('foo'), '.baz')).toBe(
      null,
    )
  })
})
