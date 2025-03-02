export function createTestKeyGenerator(prefix?: string) {
  let index = 0

  return function keyGenerator() {
    const key = `${prefix ?? ''}k${index}`
    index++
    return key
  }
}
