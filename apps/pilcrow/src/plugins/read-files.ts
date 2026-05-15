type ReadAs = 'text' | 'data-url'

export function readFiles({
  files,
  readAs,
}: {
  files: Array<File>
  readAs: ReadAs
}) {
  return Promise.allSettled(files.map((file) => readFile({file, readAs})))
}

function readFile({file, readAs}: {file: File; readAs: ReadAs}) {
  return new Promise<{file: File; result: string}>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({file, result: reader.result})
      } else {
        reject(new Error('FileReader result is not a string'))
      }
    }

    reader.onerror = reject

    if (readAs === 'text') {
      reader.readAsText(file)
    } else {
      reader.readAsDataURL(file)
    }
  })
}
