// @vitest-environment jsdom
import {afterEach, describe, expect, test, vi} from 'vitest'
import {recordInput} from './page.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe(recordInput.name, () => {
  test('records the value of a textarea the page names', () => {
    document.body.innerHTML =
      '<div contenteditable="true"></div><textarea></textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => field.value, field})

    field.value = 'foo'
    field.dispatchEvent(
      new InputEvent('input', {inputType: 'insertText', data: 'foo'}),
    )

    expect(window.__state()).toEqual({
      text: 'foo',
      events: [
        {
          type: 'input',
          inputType: 'insertText',
          data: 'foo',
          text: 'foo',
          selection: {anchor: 3, focus: 3},
          isComposing: false,
          cancelable: false,
        },
      ],
    })
  })

  test('records the value of a text input the page names', () => {
    document.body.innerHTML = '<input type="text" />'
    const field = document.querySelector('input')!
    recordInput({getText: () => field.value, field})

    field.value = 'bar'
    field.dispatchEvent(
      new InputEvent('input', {inputType: 'insertText', data: 'bar'}),
    )

    expect(window.__state()).toEqual({
      text: 'bar',
      events: [
        {
          type: 'input',
          inputType: 'insertText',
          data: 'bar',
          text: 'bar',
          selection: {anchor: 3, focus: 3},
          isComposing: false,
          cancelable: false,
        },
      ],
    })
  })

  test('reports the value of the first textarea as `dom` when the page names no field', () => {
    document.body.innerHTML =
      '<textarea>foo</textarea><div contenteditable="true">bar</div>'
    recordInput({getText: () => null})

    expect(window.__state()).toEqual({text: null, dom: 'foo', events: []})
  })

  test.for(['checkbox', 'hidden', 'button'])(
    'skips an input of type %s for `dom` when the page names no field',
    (type) => {
      document.body.innerHTML = `<input type="${type}" value="bar" /><textarea>foo</textarea>`
      recordInput({getText: () => null})

      expect(window.__state()).toEqual({text: null, dom: 'foo', events: []})
    },
  )

  test('records backward textarea selection in document mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null})
    field.setSelectionRange(1, 3, 'backward')
    field.dispatchEvent(
      new CompositionEvent('compositionupdate', {data: 'bar'}),
    )
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'compositionupdate',
          inputType: undefined,
          data: 'bar',
          text: 'foo',
          selection: {anchor: 3, focus: 1},
        },
      ],
    })
  })

  test('records backward contenteditable selection in document mode', () => {
    document.body.innerHTML = '<div contenteditable="true">foo</div>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null})
    window
      .getSelection()!
      .setBaseAndExtent(field.firstChild!, 3, field.firstChild!, 1)
    field.dispatchEvent(
      new CompositionEvent('compositionupdate', {data: 'bar'}),
    )
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'compositionupdate',
          inputType: undefined,
          data: 'bar',
          text: 'foo',
          selection: {anchor: 3, focus: 1},
        },
      ],
    })
  })

  test('records isComposing in document mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null})
    field.setSelectionRange(1, 1)
    field.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'bar',
        isComposing: true,
      }),
    )
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'bar',
          text: 'foo',
          selection: {anchor: 1, focus: 1},
          isComposing: true,
          cancelable: false,
        },
      ],
    })
  })

  test('records cancelable in document mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null})
    field.setSelectionRange(1, 1)
    field.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'bar',
        cancelable: true,
      }),
    )
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'bar',
          text: 'foo',
          selection: {anchor: 1, focus: 1},
          isComposing: false,
          cancelable: true,
        },
      ],
    })
  })

  test('reads target ranges during dispatch in document mode', () => {
    document.body.innerHTML = '<div contenteditable="true">foo</div><p>bar</p>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null})
    window.getSelection()!.removeAllRanges()
    const event = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    Object.defineProperty(event, 'getTargetRanges', {
      value: () => [
        new StaticRange({
          startContainer: field.firstChild!,
          startOffset: 1,
          endContainer: field.firstChild!,
          endOffset: 3,
        }),
        new StaticRange({
          startContainer: document.querySelector('p')!.firstChild!,
          startOffset: 0,
          endContainer: field.firstChild!,
          endOffset: 1,
        }),
      ],
    })
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'beforeinput',
          inputType: 'deleteContentBackward',
          data: null,
          text: 'foo',
          selection: null,
          isComposing: false,
          cancelable: false,
          targetRanges: [{start: 1, end: 3}, null],
        },
      ],
    })
  })
  test('reads defaultPrevented after later handlers in document mode', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<textarea>foo</textarea><pre id="log"></pre>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null})
    field.setSelectionRange(0, 0)
    field.addEventListener('beforeinput', (event) => event.preventDefault())
    field.dispatchEvent(new InputEvent('beforeinput', {cancelable: true}))
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: true,
        },
      ],
    })
    vi.advanceTimersByTime(0)
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: true,
          defaultPrevented: true,
        },
      ],
    })
    expect(document.getElementById('log')!.textContent).toEqual(
      '{"type":"beforeinput","inputType":"","data":null,"text":"foo","selection":{"anchor":0,"focus":0},"isComposing":false,"cancelable":true,"defaultPrevented":true}',
    )
  })

  test('records backward textarea selection in field mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    field.setSelectionRange(1, 3, 'backward')
    field.dispatchEvent(
      new CompositionEvent('compositionupdate', {data: 'bar'}),
    )
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'compositionupdate',
          inputType: undefined,
          data: 'bar',
          text: 'foo',
          selection: {anchor: 3, focus: 1},
        },
      ],
    })
  })

  test('records backward contenteditable selection in field mode', () => {
    document.body.innerHTML = '<div contenteditable="true">foo</div>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null, field})
    window
      .getSelection()!
      .setBaseAndExtent(field.firstChild!, 3, field.firstChild!, 1)
    field.dispatchEvent(
      new CompositionEvent('compositionupdate', {data: 'bar'}),
    )
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'compositionupdate',
          inputType: undefined,
          data: 'bar',
          text: 'foo',
          selection: {anchor: 3, focus: 1},
        },
      ],
    })
  })

  test('records isComposing in field mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    field.setSelectionRange(1, 1)
    field.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'bar',
        isComposing: true,
      }),
    )
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'bar',
          text: 'foo',
          selection: {anchor: 1, focus: 1},
          isComposing: true,
          cancelable: false,
        },
      ],
    })
  })

  test('records cancelable in field mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    field.setSelectionRange(1, 1)
    field.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'bar',
        cancelable: true,
      }),
    )
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: 'insertText',
          data: 'bar',
          text: 'foo',
          selection: {anchor: 1, focus: 1},
          isComposing: false,
          cancelable: true,
        },
      ],
    })
  })

  test('reads target ranges during dispatch in field mode', () => {
    document.body.innerHTML = '<div contenteditable="true">foo</div><p>bar</p>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null, field})
    window.getSelection()!.removeAllRanges()
    const event = new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    Object.defineProperty(event, 'getTargetRanges', {
      value: () => [
        new StaticRange({
          startContainer: field.firstChild!,
          startOffset: 1,
          endContainer: field.firstChild!,
          endOffset: 3,
        }),
        new StaticRange({
          startContainer: document.querySelector('p')!.firstChild!,
          startOffset: 0,
          endContainer: field.firstChild!,
          endOffset: 1,
        }),
      ],
    })
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: 'deleteContentBackward',
          data: null,
          text: 'foo',
          selection: null,
          isComposing: false,
          cancelable: false,
          targetRanges: [{start: 1, end: 3}, null],
        },
      ],
    })
  })
  test('reads defaultPrevented after later handlers in field mode', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<textarea>foo</textarea><pre id="log"></pre>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    field.setSelectionRange(0, 0)
    field.addEventListener('beforeinput', (event) => event.preventDefault())
    field.dispatchEvent(new InputEvent('beforeinput', {cancelable: true}))
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: true,
        },
      ],
    })
    vi.advanceTimersByTime(0)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: true,
          defaultPrevented: true,
        },
      ],
    })
    expect(document.getElementById('log')!.textContent).toEqual(
      '{"type":"beforeinput","inputType":"","data":null,"text":"foo","selection":{"anchor":0,"focus":0},"isComposing":false,"cancelable":true,"defaultPrevented":true}',
    )
  })

  test('resolves document text at event time and records null without a field', () => {
    document.body.innerHTML = ''
    recordInput({getText: () => null})
    document.dispatchEvent(new CompositionEvent('compositionstart', {data: ''}))
    document.body.innerHTML = '<textarea>foo</textarea>'
    document.dispatchEvent(
      new CompositionEvent('compositionupdate', {data: 'bar'}),
    )
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'compositionstart',
          inputType: undefined,
          data: '',
          text: null,
          selection: null,
        },
        {
          type: 'compositionupdate',
          inputType: undefined,
          data: 'bar',
          text: 'foo',
          selection: {anchor: 0, focus: 0},
        },
      ],
    })
  })
  test('records null for a throwing getter and preserves the event', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    const event = new InputEvent('input')
    Object.defineProperty(event, 'isComposing', {
      get() {
        throw new Error('foo')
      },
    })
    Object.defineProperty(event, 'getTargetRanges', {value: () => []})
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'input',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: null,
          cancelable: false,
          targetRanges: [],
        },
      ],
    })
  })

  test('counts UTF-16 offsets across contenteditable children', () => {
    document.body.innerHTML =
      '<div contenteditable="true"><span>😀</span><span>foo</span></div>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null, field})
    window
      .getSelection()!
      .setBaseAndExtent(
        field.lastChild!.firstChild!,
        1,
        field.firstChild!.firstChild!,
        0,
      )
    field.dispatchEvent(new CompositionEvent('compositionend', {data: 'foo'}))
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'compositionend',
          inputType: undefined,
          data: 'foo',
          text: '😀foo',
          selection: {anchor: 3, focus: 0},
        },
      ],
    })
  })

  test('records null when the selection leaves the field', () => {
    document.body.innerHTML = '<div contenteditable="true">foo</div><p>bar</p>'
    const field = document.querySelector('div')!
    recordInput({getText: () => null, field})
    window
      .getSelection()!
      .setBaseAndExtent(
        field.firstChild!,
        1,
        document.querySelector('p')!.firstChild!,
        2,
      )
    field.dispatchEvent(new CompositionEvent('compositionend', {data: 'foo'}))
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'compositionend',
          inputType: undefined,
          data: 'foo',
          text: 'foo',
          selection: null,
        },
      ],
    })
  })

  test('isolates throwing reads of text, selection and target ranges', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    Object.defineProperty(field, 'value', {
      get() {
        throw new Error('foo')
      },
    })
    Object.defineProperty(field, 'selectionStart', {
      get() {
        throw new Error('foo')
      },
    })
    const event = new InputEvent('beforeinput')
    Object.defineProperty(event, 'getTargetRanges', {
      get() {
        throw new Error('foo')
      },
    })
    Object.defineProperty(event, 'cancelable', {
      get() {
        throw new Error('foo')
      },
    })
    Object.defineProperty(event, 'defaultPrevented', {
      get() {
        throw new Error('foo')
      },
    })
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: null,
          selection: null,
          isComposing: false,
          cancelable: null,
          targetRanges: null,
        },
      ],
    })
    vi.advanceTimersByTime(0)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'beforeinput',
          inputType: '',
          data: null,
          text: null,
          selection: null,
          isComposing: false,
          cancelable: null,
          targetRanges: null,
          defaultPrevented: null,
        },
      ],
    })
  })

  test('omits targetRanges when unavailable in document mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null})
    const event = new InputEvent('input')
    Object.defineProperty(event, 'getTargetRanges', {value: undefined})
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      dom: 'foo',
      events: [
        {
          type: 'input',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: false,
        },
      ],
    })
  })

  test('omits targetRanges when unavailable in field mode', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => null, field})
    const event = new InputEvent('input')
    Object.defineProperty(event, 'getTargetRanges', {value: undefined})
    field.dispatchEvent(event)
    expect(window.__state()).toEqual({
      text: null,
      events: [
        {
          type: 'input',
          inputType: '',
          data: null,
          text: 'foo',
          selection: {anchor: 0, focus: 0},
          isComposing: false,
          cancelable: false,
        },
      ],
    })
  })
})
