import type {
  PortableTextBlock,
  PortableTextTextBlock,
} from '@portabletext/schema'

/**
 * Deterministic Portable Text value-pair generator for round-trip property
 * tests: `(value, mutated value)` pairs whose diff-into-patches must apply
 * back to the mutated value exactly. Values stay within the fixture schema:
 * decorators `strong`/`em`, annotation `link`, inline object `stock-ticker`,
 * block object `image`.
 */

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    // Park-Miller LCG: deterministic across runs and platforms.
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

type Rng = () => number

function pick<Item>(rng: Rng, items: ReadonlyArray<Item>): Item {
  return items[Math.floor(rng() * items.length)]!
}

function pickIndex(rng: Rng, length: number): number {
  return Math.floor(rng() * length)
}

const WORDS = [
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
]

function word(rng: Rng): string {
  return pick(rng, WORDS)
}

function generateValue(
  rng: Rng,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const blockCount = 1 + pickIndex(rng, 4)
  const blocks: Array<PortableTextBlock> = []

  for (let index = 0; index < blockCount; index++) {
    if (rng() < 0.15) {
      blocks.push({
        _type: 'image',
        _key: keyGenerator(),
        url: `https://example.com/${word(rng)}.png`,
      })
      continue
    }
    blocks.push(generateTextBlock(rng, keyGenerator))
  }

  return blocks
}

function generateTextBlock(
  rng: Rng,
  keyGenerator: () => string,
): PortableTextTextBlock {
  const spanCount = 1 + pickIndex(rng, 3)
  const markDefs: PortableTextTextBlock['markDefs'] = []
  const children: PortableTextTextBlock['children'] = []

  for (let index = 0; index < spanCount; index++) {
    const marks: Array<string> = []
    if (rng() < 0.3) {
      marks.push(pick(rng, ['strong', 'em']))
    }
    if (rng() < 0.15) {
      const defKey = keyGenerator()
      markDefs.push({
        _type: 'link',
        _key: defKey,
        href: `https://example.com/${word(rng)}`,
      })
      marks.push(defKey)
    }
    children.push({
      _type: 'span',
      _key: keyGenerator(),
      text: `${word(rng)} ${word(rng)}`,
      marks,
    })
    if (rng() < 0.1) {
      children.push({
        _type: 'stock-ticker',
        _key: keyGenerator(),
        symbol: word(rng).toUpperCase(),
      })
      children.push({_type: 'span', _key: keyGenerator(), text: '', marks: []})
    }
  }

  const block: PortableTextTextBlock = {
    _type: 'block',
    _key: keyGenerator(),
    children,
    markDefs,
    style: rng() < 0.2 ? 'h1' : 'normal',
  }

  if (rng() < 0.2) {
    block.listItem = 'bullet'
    block.level = 1
  }

  return block
}

function clone<Value>(value: Value): Value {
  return structuredClone(value)
}

function isTextBlock(block: PortableTextBlock): block is PortableTextTextBlock {
  return block._type === 'block'
}

type Mutation = (
  value: Array<PortableTextBlock>,
  rng: Rng,
  keyGenerator: () => string,
) => void

const mutations: ReadonlyArray<Mutation> = [
  function editSpanText(value, rng) {
    const span = pickSpan(value, rng)
    if (span) {
      span.text = rng() < 0.5 ? `${span.text} ${word(rng)}` : word(rng)
    }
  },
  function toggleDecorator(value, rng) {
    const span = pickSpan(value, rng)
    if (span) {
      const decorator = pick(rng, ['strong', 'em'])
      span.marks = span.marks?.includes(decorator)
        ? span.marks.filter((mark) => mark !== decorator)
        : [...(span.marks ?? []), decorator]
    }
  },
  function addAnnotation(value, rng, keyGenerator) {
    const block = pickTextBlock(value, rng)
    const span = block ? pickSpanInBlock(block, rng) : undefined
    if (block && span) {
      const defKey = keyGenerator()
      block.markDefs = [
        ...(block.markDefs ?? []),
        {_type: 'link', _key: defKey, href: `https://example.com/${word(rng)}`},
      ]
      span.marks = [...(span.marks ?? []), defKey]
    }
  },
  function removeAnnotation(value, rng) {
    const block = pickTextBlock(value, rng)
    const def = block?.markDefs?.length ? pick(rng, block.markDefs) : undefined
    if (block && def) {
      block.markDefs = block.markDefs?.filter(
        (candidate) => candidate._key !== def._key,
      )
      for (const child of block.children) {
        if (Array.isArray(child.marks)) {
          child.marks = child.marks.filter((mark) => mark !== def._key)
        }
      }
    }
  },
  function insertTextBlock(value, rng, keyGenerator) {
    value.splice(
      pickIndex(rng, value.length + 1),
      0,
      generateTextBlock(rng, keyGenerator),
    )
  },
  function insertBlockObject(value, rng, keyGenerator) {
    value.splice(pickIndex(rng, value.length + 1), 0, {
      _type: 'image',
      _key: keyGenerator(),
      url: `https://example.com/${word(rng)}.png`,
    })
  },
  function removeBlock(value, rng) {
    if (value.length > 1) {
      value.splice(pickIndex(rng, value.length), 1)
    }
  },
  function swapBlocks(value, rng) {
    if (value.length > 1) {
      const indexA = pickIndex(rng, value.length)
      const indexB = pickIndex(rng, value.length)
      const blockA = value[indexA]!
      value[indexA] = value[indexB]!
      value[indexB] = blockA
    }
  },
  function rekeyBlock(value, rng, keyGenerator) {
    const block = value[pickIndex(rng, value.length)]
    if (block) {
      block._key = keyGenerator()
    }
  },
  function rekeyChild(value, rng, keyGenerator) {
    const block = pickTextBlock(value, rng)
    const child = block
      ? block.children[pickIndex(rng, block.children.length)]
      : undefined
    if (child) {
      child._key = keyGenerator()
    }
  },
  function splitSpan(value, rng, keyGenerator) {
    const block = pickTextBlock(value, rng)
    if (!block) {
      return
    }
    const index = pickIndex(rng, block.children.length)
    const child = block.children[index]
    if (child && child._type === 'span' && typeof child.text === 'string') {
      const splitAt = Math.ceil(child.text.length / 2)
      block.children.splice(
        index,
        1,
        {...child, text: child.text.slice(0, splitAt)},
        {
          ...clone(child),
          _key: keyGenerator(),
          text: child.text.slice(splitAt),
        },
      )
    }
  },
  function replaceAllChildren(value, rng, keyGenerator) {
    const block = pickTextBlock(value, rng)
    if (block) {
      block.children = [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: `${word(rng)} ${word(rng)} ${word(rng)}`,
          marks: [],
        },
      ]
      block.markDefs = []
    }
  },
  function changeStyle(value, rng) {
    const block = pickTextBlock(value, rng)
    if (block) {
      block.style = pick(rng, ['normal', 'h1', 'h2', 'blockquote'])
    }
  },
  function toggleListItem(value, rng) {
    const block = pickTextBlock(value, rng)
    if (block) {
      if (block.listItem) {
        delete block.listItem
        delete block.level
      } else {
        block.listItem = 'bullet'
        block.level = 1 + pickIndex(rng, 2)
      }
    }
  },
]

function pickTextBlock(
  value: Array<PortableTextBlock>,
  rng: Rng,
): PortableTextTextBlock | undefined {
  const textBlocks = value.filter(isTextBlock)
  return textBlocks.length > 0 ? pick(rng, textBlocks) : undefined
}

type MutableSpan = {
  _type: 'span'
  _key: string
  text: string
  marks?: Array<string>
}

function pickSpanInBlock(
  block: PortableTextTextBlock,
  rng: Rng,
): MutableSpan | undefined {
  const spans = block.children.filter(
    (child): child is MutableSpan => child._type === 'span',
  )
  return spans.length > 0 ? pick(rng, spans) : undefined
}

function pickSpan(value: Array<PortableTextBlock>, rng: Rng) {
  const block = pickTextBlock(value, rng)
  return block ? pickSpanInBlock(block, rng) : undefined
}

export function generateValuePair(
  seed: number,
  keyGenerator: () => string,
): {
  fromValue: Array<PortableTextBlock>
  toValue: Array<PortableTextBlock>
} {
  const rng = createSeededRng(seed)
  const fromValue = generateValue(rng, keyGenerator)
  const toValue = clone(fromValue)
  const mutationCount = 1 + pickIndex(rng, 3)

  for (let index = 0; index < mutationCount; index++) {
    pick(rng, mutations)(toValue, rng, keyGenerator)
  }

  return {fromValue, toValue}
}
