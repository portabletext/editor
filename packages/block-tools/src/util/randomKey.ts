export function keyGenerator() {
  return randomKey(12)
}

function cryptoRNG(length = 16) {
  const rnds8 = new Uint8Array(length)
  globalThis.crypto.getRandomValues(rnds8)
  return rnds8
}

const byteToHex: string[] = []
for (let i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).slice(1)
}

/**
 * Generate a random key of the given length
 *
 * @param length - Length of string to generate
 * @returns A string of the given length
 * @public
 */
export function randomKey(length: number): string {
  return cryptoRNG(length)
    .reduce((str, n) => str + byteToHex[n], '')
    .slice(0, length)
}
