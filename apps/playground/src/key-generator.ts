export function createKeyGenerator(prefix: string) {
  let index = 0
  return function keyGenerator(): string {
    index++
    return `${prefix}${index}`
  }
}
