export function createKeyGenerator(prefix: string) {
  let index = 0
  return function keyGenerator(): string {
    return `${prefix}${index++}`
  }
}
