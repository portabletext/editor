export function createTestKeyGenerator() {
  let index = 0

  return function keyGenerator() {
    const key = `randomKey${index}`
    index++
    return key
  }
}
