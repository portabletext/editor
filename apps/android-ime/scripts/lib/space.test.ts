import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {completes, pageGotSpace, readStrip, stripSuggestions, stripSwitched} from './space.ts'

// Dumps from the Space probe's run 41255435645 on English Gboard, `Kyou` typed into a plain field: right
// before a tap on Space, right after it, which the page got, and right after a tap in Gboard's
// navigation bar that hit no key.
const completions = fixture('en-strip-completions.xml')
const predictions = fixture('en-strip-predictions.xml')
const afterOutsideTap = fixture('en-strip-after-outside-tap.xml')

describe(stripSuggestions.name, () => {
  test('reads the completions of the typed word before the Space', () => {
    expect(stripSuggestions(completions)).toEqual(['Kyou', 'You', 'Kyu'])
  })

  test('reads the next-word predictions after the Space the page got', () => {
    expect(stripSuggestions(predictions)).toEqual(['you', 'I', 'to'])
  })

  test('reads the same completions after a tap that hit no key', () => {
    expect(stripSuggestions(afterOutsideTap)).toEqual(['Kyou', 'You', 'Kyu'])
  })

  test('reads nothing from the idle strip, whose toolbar holds no suggestion', () => {
    expect(stripSuggestions(fixture('en-keyboard.xml'))).toEqual([])
  })
})

describe(readStrip.name, () => {
  test('reads the strip of a whole dump', () => {
    expect(readStrip({xml: predictions, partial: false})).toEqual({suggestions: ['you', 'I', 'to']})
  })

  test('leaves the strip of a dump without a whole keyboard unread, though it holds a strip', () => {
    expect(readStrip({xml: predictions, partial: true})).toEqual({unread: 'the dump held no whole keyboard'})
  })

  test('leaves the strip of a dump that does not parse unread, naming the parse error, and never throws', () => {
    expect(readStrip({xml: predictions.replace('</hierarchy>', '<node'), partial: false})).toEqual({
      unread: 'the dump does not parse: Error: malformed XML near offset 109926',
    })
  })
})

describe(completes.name, () => {
  test('counts a suggestion that begins with the letters, whatever their case', () => {
    expect({
      completions: completes(['Kyou', 'You', 'Kyu'], 'kyou'),
      predictions: completes(['you', 'I', 'to'], 'kyou'),
    }).toEqual({completions: true, predictions: false})
  })
})

describe(stripSwitched.name, () => {
  test('is true for the strip around the Space the page got', () => {
    expect(
      stripSwitched(
        stripSuggestions(completions),
        stripSuggestions(predictions),
        'kyou',
      ),
    ).toEqual(true)
  })

  test('is false for the strip around a tap that hit no key', () => {
    expect(
      stripSwitched(
        stripSuggestions(completions),
        stripSuggestions(afterOutsideTap),
        'kyou',
      ),
    ).toEqual(false)
  })

  test('is false when the strip after the tap shows no suggestion, as with the keyboard closed', () => {
    expect(stripSwitched(stripSuggestions(completions), [], 'kyou')).toEqual(
      false,
    )
  })

  test('is false when the strip before the tap held no completion of the letters', () => {
    expect(
      stripSwitched(
        ['Kou', 'You', 'Kourtney'],
        stripSuggestions(predictions),
        'kyou',
      ),
    ).toEqual(false)
  })
})

describe(pageGotSpace.name, () => {
  test('is true for a `beforeinput` of a space since the read once the letters were tapped', () => {
    expect(
      pageGotSpace(
        {events: [{type: 'beforeinput', data: 'u'}]},
        {
          text: 'Kyou',
          events: [
            {type: 'beforeinput', data: 'u'},
            {type: 'beforeinput', data: ' '},
          ],
        },
      ),
    ).toEqual(true)
  })

  test('is true for a text that ends in a space, a no-break space included', () => {
    expect({
      space: pageGotSpace({events: []}, {text: 'Kyou ', events: []}),
      noBreak: pageGotSpace({events: []}, {text: 'Kyou ', events: []}),
    }).toEqual({space: true, noBreak: true})
  })

  test('is false for the recorded read after word 1 of `Kyoukyou `, whose Space never reached the page', () => {
    expect(
      pageGotSpace(
        {events: [{type: 'beforeinput', data: 'u'}]},
        {text: 'Kyou', events: [{type: 'beforeinput', data: 'u'}]},
      ),
    ).toEqual(false)
  })
})

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}
