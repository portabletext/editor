export function defaultKeyGenerator() {
  return randomKey(12)
}

/**
 * Wraps a caller-supplied key generator so one conversion can never
 * mint the same key twice. Keys attach content to its identity at
 * creation time (a span's `marks` entry points at the mark definition
 * minted with the same key), so a generator that repeats a key does
 * not just violate sibling uniqueness, it makes ownership ambiguous in
 * a way no later pass can repair: two definitions sharing a key leave
 * every referencing span attributable to either. Bounded retries, then
 * deterministic suffixing, mirroring how sibling-uniqueness repair
 * treats a generator that keeps returning claimed keys.
 */
export function uniqueKeyGenerator(generator: () => string): () => string {
  const mintedKeys = new Set<string>()
  return () => {
    let candidate = generator()
    for (let attempt = 0; attempt < 3 && mintedKeys.has(candidate); attempt++) {
      candidate = generator()
    }
    if (mintedKeys.has(candidate)) {
      const base = candidate
      let suffix = 2
      while (mintedKeys.has(`${base}-${suffix}`)) {
        suffix++
      }
      candidate = `${base}-${suffix}`
    }
    mintedKeys.add(candidate)
    return candidate
  }
}

const getByteHexTable = (() => {
  let table: any[]
  return () => {
    if (table) {
      return table
    }

    table = []
    for (let i = 0; i < 256; ++i) {
      table[i] = (i + 0x100).toString(16).slice(1)
    }
    return table
  }
})()

// WHATWG crypto RNG - https://w3c.github.io/webcrypto/Overview.html
function whatwgRNG(length = 16) {
  const rnds8 = new Uint8Array(length)
  crypto.getRandomValues(rnds8)
  return rnds8
}

function randomKey(length?: number): string {
  const table = getByteHexTable()
  return whatwgRNG(length)
    .reduce((str, n) => str + table[n], '')
    .slice(0, length)
}
