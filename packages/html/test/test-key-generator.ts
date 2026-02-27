export function createTestKeyGenerator(prefix = 'randomKey') {
  let index = 0

  return function keyGenerator() {
    const key = `${prefix}${index}`
    index++
    return key
  }
}
