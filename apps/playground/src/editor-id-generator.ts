export function* editorIdGenerator(): Generator<string, string> {
  let index = 0
  while (true) {
    yield `${index++}`
  }
}
