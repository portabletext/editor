// @vitest-environment jsdom
import {
  act,
  createElement,
  Fragment,
  startTransition,
  Suspense,
  useLayoutEffect,
} from 'react'
import {createRoot, type Root} from 'react-dom/client'
import {afterEach, beforeEach, describe, expect, test} from 'vitest'
import {Committed} from './committed'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLElement
let root: Root
let log: string[]

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  log = []
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe(Committed.name, () => {
  test('records the value on mount, before the layout effects of what renders after it', () => {
    act(() => root.render(createElement(App, {value: 'foo'})))

    expect({log, dom: container.textContent}).toEqual({
      log: ['rendered foo', 'recorded foo over foo', 'layout foo'],
      dom: 'foo',
    })
  })

  test('records a committed update once, before its DOM mutations', () => {
    act(() => root.render(createElement(App, {value: 'foo'})))
    act(() => root.render(createElement(App, {value: 'bar'})))
    act(() => root.render(createElement(App, {value: 'bar'})))

    expect({log, dom: container.textContent}).toEqual({
      log: [
        'rendered foo',
        'recorded foo over foo',
        'layout foo',
        'rendered bar',
        'recorded bar over foo',
        'layout bar',
        'rendered bar',
      ],
      dom: 'bar',
    })
  })

  test('records nothing for a render that suspends and never commits', () => {
    act(() => root.render(createElement(App, {value: 'foo'})))
    act(() =>
      startTransition(() =>
        root.render(createElement(App, {value: 'bar', suspend: true})),
      ),
    )

    expect({log, dom: container.textContent}).toEqual({
      log: [
        'rendered foo',
        'recorded foo over foo',
        'layout foo',
        'rendered bar',
      ],
      dom: 'foo',
    })
  })

  test('records nothing for a render superseded before it commits, and the one that commits once', () => {
    act(() => root.render(createElement(App, {value: 'foo'})))
    act(() =>
      startTransition(() =>
        root.render(createElement(App, {value: 'bar', suspend: true})),
      ),
    )
    act(() => root.render(createElement(App, {value: 'baz'})))

    expect({log, dom: container.textContent}).toEqual({
      log: [
        'rendered foo',
        'recorded foo over foo',
        'layout foo',
        'rendered bar',
        'rendered baz',
        'recorded baz over foo',
        'layout baz',
      ],
      dom: 'baz',
    })
  })
})

const never = new Promise<never>(() => {})

function App({value, suspend = false}: {value: string; suspend?: boolean}) {
  return createElement(
    Suspense,
    {fallback: 'fallback'},
    createElement(Committed<string>, {
      value,
      record: (committed) =>
        log.push(`recorded ${committed} over ${container.textContent}`),
    }),
    createElement(Shown, {value, suspend}),
  )
}

function Shown({value, suspend}: {value: string; suspend: boolean}) {
  log.push(`rendered ${value}`)
  useLayoutEffect(() => {
    log.push(`layout ${value}`)
  }, [value])
  if (suspend) throw never
  return createElement(Fragment, null, value)
}
