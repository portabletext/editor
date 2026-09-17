import type {Rng} from '../stats/rng'

const FILLER_WORDS = [
  'foo',
  'bar',
  'baz',
  'qux',
  'quux',
  'corge',
  'grault',
  'garply',
]

export function buildSentence(rng: Rng, wordCount: number): string {
  const words: string[] = []
  for (let index = 0; index < wordCount; index++) {
    const word = FILLER_WORDS[Math.floor(rng() * FILLER_WORDS.length)]
    if (word === undefined) throw new Error('unreachable')
    words.push(word)
  }
  return words.join(' ')
}

export function createKeyGenerator(prefix: string): () => string {
  let counter = 0
  return () => {
    counter += 1
    return `${prefix}${counter}`
  }
}
