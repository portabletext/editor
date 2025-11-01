/**
 * @public
 */
export const defaultKeyGenerator = (): string => randomKey(12)

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

function cryptoRNG(length = 16) {
  const rnds8 = new Uint8Array(length)
  globalThis.crypto.getRandomValues(rnds8)
  return rnds8
}

function randomKey(length?: number): string {
  const table = getByteHexTable()
  return cryptoRNG(length)
    .reduce((str, n) => str + table[n], '')
    .slice(0, length)
}
