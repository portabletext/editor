/* oxlint-disable no-restricted-globals -- The probe artifacts serialize the recorder without transformation. */
import {mkdir, writeFile} from 'node:fs/promises'
import {
  openTestImePage,
  ime,
  addImeOutsideSibling as addOutsideSibling,
  readImeSnapshot as readSnapshot,
} from 'thumbjar'
import {test} from 'vitest'

test('Scenario: testime-compose-word on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-compose-word',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'h'],
      response: await ime.compose('h'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'he'],
      response: await ime.compose('he'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-word-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-word',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-word on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-compose-word',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'h'],
      response: await ime.compose('h'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'he'],
      response: await ime.compose('he'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-word-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-word',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-word on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-compose-word',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'h'],
      response: await ime.compose('h'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'he'],
      response: await ime.compose('he'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-word-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-word',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-word on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-compose-word',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'h'],
      response: await ime.compose('h'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'he'],
      response: await ime.compose('he'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-word-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-word',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-autocorrect on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-autocorrect',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'teh'],
      response: await ime.compose('teh'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the '],
      response: await ime.commit('the '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-autocorrect-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'autocorrect',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-autocorrect on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-autocorrect',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'teh'],
      response: await ime.compose('teh'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the '],
      response: await ime.commit('the '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-autocorrect-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'autocorrect',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-autocorrect on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-autocorrect',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'teh'],
      response: await ime.compose('teh'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the '],
      response: await ime.commit('the '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-autocorrect-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'autocorrect',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-autocorrect on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-autocorrect',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'teh'],
      response: await ime.compose('teh'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the '],
      response: await ime.commit('the '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-autocorrect-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'autocorrect',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-suggestion-pick on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-suggestion-pick',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'helo'],
      response: await ime.compose('helo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'hello '],
      response: await ime.commit('hello '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-suggestion-pick-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'suggestion-pick',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-suggestion-pick on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-suggestion-pick',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'helo'],
      response: await ime.compose('helo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'hello '],
      response: await ime.commit('hello '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-suggestion-pick-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'suggestion-pick',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-suggestion-pick on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-suggestion-pick',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'helo'],
      response: await ime.compose('helo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'hello '],
      response: await ime.commit('hello '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-suggestion-pick-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'suggestion-pick',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-suggestion-pick on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-suggestion-pick',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'helo'],
      response: await ime.compose('helo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'hello '],
      response: await ime.commit('hello '),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-suggestion-pick-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'suggestion-pick',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-respell-earlier on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-respell-earlier',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'teh cat '],
      response: await ime.commit('teh cat '),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 3],
      response: await ime.region(0, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the'],
      response: await ime.commit('the'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 8, 8],
      response: await ime.select(8, 8),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'sat'],
      response: await ime.compose('sat'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-respell-earlier-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'respell-earlier',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-respell-earlier on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-respell-earlier',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'teh cat '],
      response: await ime.commit('teh cat '),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 3],
      response: await ime.region(0, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the'],
      response: await ime.commit('the'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 8, 8],
      response: await ime.select(8, 8),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'sat'],
      response: await ime.compose('sat'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-respell-earlier-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'respell-earlier',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-respell-earlier on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-respell-earlier',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'teh cat '],
      response: await ime.commit('teh cat '),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 3],
      response: await ime.region(0, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the'],
      response: await ime.commit('the'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 8, 8],
      response: await ime.select(8, 8),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'sat'],
      response: await ime.compose('sat'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-respell-earlier-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'respell-earlier',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-respell-earlier on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-respell-earlier',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'teh cat '],
      response: await ime.commit('teh cat '),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 3],
      response: await ime.region(0, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'the'],
      response: await ime.commit('the'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 8, 8],
      response: await ime.select(8, 8),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'sat'],
      response: await ime.compose('sat'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-respell-earlier-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'respell-earlier',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-recompose-under-caret on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-recompose-under-caret',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 3, 3],
      response: await ime.select(3, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 5],
      response: await ime.region(0, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-recompose-under-caret-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'recompose-under-caret',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-recompose-under-caret on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-recompose-under-caret',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 3, 3],
      response: await ime.select(3, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 5],
      response: await ime.region(0, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-recompose-under-caret-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'recompose-under-caret',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-recompose-under-caret on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-recompose-under-caret',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 3, 3],
      response: await ime.select(3, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 5],
      response: await ime.region(0, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-recompose-under-caret-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'recompose-under-caret',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-recompose-under-caret on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-recompose-under-caret',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 3, 3],
      response: await ime.select(3, 3),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 5],
      response: await ime.region(0, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-recompose-under-caret-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'recompose-under-caret',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-backspace-in-composition on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-backspace-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-backspace-in-composition-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'backspace-in-composition',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-backspace-in-composition on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-backspace-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-backspace-in-composition-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'backspace-in-composition',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-backspace-in-composition on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-backspace-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-backspace-in-composition-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'backspace-in-composition',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-backspace-in-composition on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-backspace-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'hello'],
      response: await ime.compose('hello'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hell'],
      response: await ime.compose('hell'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'hel'],
      response: await ime.compose('hel'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-backspace-in-composition-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'backspace-in-composition',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-enter-in-composition on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-enter-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'foo'],
      response: await ime.compose('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['key', 66],
      response: await ime.key(66),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'bar'],
      response: await ime.compose('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-enter-in-composition-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'enter-in-composition',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-enter-in-composition on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-enter-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'foo'],
      response: await ime.compose('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['key', 66],
      response: await ime.key(66),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'bar'],
      response: await ime.compose('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-enter-in-composition-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'enter-in-composition',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-enter-in-composition on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-enter-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'foo'],
      response: await ime.compose('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['key', 66],
      response: await ime.key(66),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'bar'],
      response: await ime.compose('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-enter-in-composition-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'enter-in-composition',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-enter-in-composition on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-enter-in-composition',
  )
  const commands = []
  try {
    commands.push({
      operation: ['compose', 'foo'],
      response: await ime.compose('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['key', 66],
      response: await ime.key(66),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'bar'],
      response: await ime.compose('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-enter-in-composition-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'enter-in-composition',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-delete-surrounding on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-delete-surrounding',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 6, 0],
      response: await ime.delete(6, 0),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-delete-surrounding-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'delete-surrounding',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-delete-surrounding on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-delete-surrounding',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 6, 0],
      response: await ime.delete(6, 0),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-delete-surrounding-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'delete-surrounding',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-delete-surrounding on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-delete-surrounding',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 6, 0],
      response: await ime.delete(6, 0),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-delete-surrounding-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'delete-surrounding',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-delete-surrounding on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-delete-surrounding',
  )
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 6, 0],
      response: await ime.delete(6, 0),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-delete-surrounding-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'delete-surrounding',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-across-bold on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-compose-across-bold&prefix=foobarbaz',
  )
  const commands = []
  try {
    commands.push({
      operation: ['region', 2, 4],
      response: await ime.region(2, 4),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-across-bold-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-across-bold',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-across-bold on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-compose-across-bold&prefix=foobarbaz',
  )
  const commands = []
  try {
    commands.push({
      operation: ['region', 2, 4],
      response: await ime.region(2, 4),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-across-bold-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-across-bold',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-across-bold on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-compose-across-bold&prefix=foobarbaz',
  )
  const commands = []
  try {
    commands.push({
      operation: ['region', 2, 4],
      response: await ime.region(2, 4),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-across-bold-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-across-bold',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-compose-across-bold on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-compose-across-bold&prefix=foo&bold=bar&suffix=baz',
  )
  const commands = []
  try {
    commands.push({
      operation: ['region', 2, 4],
      response: await ime.region(2, 4),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['compose', 'help'],
      response: await ime.compose('help'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-compose-across-bold-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'compose-across-bold',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-outside-target on plain', async () => {
  await openTestImePage(
    'http://localhost:8765/plain.html?probe=testime-outside-target',
  )
  await addOutsideSibling()
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', -8, 5],
      response: await ime.region(-8, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'foo'],
      response: await ime.commit('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 1000],
      response: await ime.region(0, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'bar'],
      response: await ime.commit('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 1000, 1000],
      response: await ime.select(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'baz'],
      response: await ime.commit('baz'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 1000, 1000],
      response: await ime.delete(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-outside-target-plain.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'outside-target',
        page: 'plain',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-outside-target on prevent', async () => {
  await openTestImePage(
    'http://localhost:8765/prevent.html?probe=testime-outside-target',
  )
  await addOutsideSibling()
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', -8, 5],
      response: await ime.region(-8, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'foo'],
      response: await ime.commit('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 1000],
      response: await ime.region(0, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'bar'],
      response: await ime.commit('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 1000, 1000],
      response: await ime.select(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'baz'],
      response: await ime.commit('baz'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 1000, 1000],
      response: await ime.delete(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-outside-target-prevent.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'outside-target',
        page: 'prevent',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-outside-target on editor', async () => {
  await openTestImePage(
    'http://localhost:8765/editor.html?probe=testime-outside-target',
  )
  await addOutsideSibling()
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', -8, 5],
      response: await ime.region(-8, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'foo'],
      response: await ime.commit('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 1000],
      response: await ime.region(0, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'bar'],
      response: await ime.commit('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 1000, 1000],
      response: await ime.select(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'baz'],
      response: await ime.commit('baz'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 1000, 1000],
      response: await ime.delete(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-outside-target-editor.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'outside-target',
        page: 'editor',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})

test('Scenario: testime-outside-target on editor-bold', async () => {
  await openTestImePage(
    'http://localhost:8765/editor-bold.html?probe=testime-outside-target',
  )
  await addOutsideSibling()
  const commands = []
  try {
    commands.push({
      operation: ['commit', 'hello world'],
      response: await ime.commit('hello world'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', -8, 5],
      response: await ime.region(-8, 5),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'foo'],
      response: await ime.commit('foo'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['region', 0, 1000],
      response: await ime.region(0, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'bar'],
      response: await ime.commit('bar'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['select', 1000, 1000],
      response: await ime.select(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['commit', 'baz'],
      response: await ime.commit('baz'),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['delete', 1000, 1000],
      response: await ime.delete(1000, 1000),
      snapshot: await readSnapshot(),
    })
    commands.push({
      operation: ['finish'],
      response: await ime.finish(),
      snapshot: await readSnapshot(),
    })
  } finally {
    const directory = new URL('../out/matrix/', import.meta.url)
    await mkdir(directory, {recursive: true})
    await writeFile(
      new URL('testime-outside-target-editor-bold.json', directory),
      JSON.stringify({
        source: 'test-ime',
        case: 'outside-target',
        page: 'editor-bold',
        keyboard: 'en',
        commands,
        final: await readSnapshot(),
      }),
    )
  }
})
