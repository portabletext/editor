export function createTestKeyGenerator() {
  let index = 0

  return function keyGenerator() {
    const key = `k${index}`
    index++
    return key
  }
}
