import {once} from 'node:events'
import {createServer} from 'node:http'
import {expect, test} from 'vitest'
import {httpReady} from './http.ts'

test('accepts a redirect without following it', async () => {
  const paths: string[] = []
  const server = createServer((request, response) => {
    paths.push(request.url ?? '')
    response.writeHead(302, {location: '/elsewhere'})
    response.end('redirect')
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('missing address')
    }
    expect(
      await httpReady(
        `http://127.0.0.1:${address.port}/`,
        new AbortController().signal,
      ),
    ).toEqual(true)
    expect(paths).toEqual(['/'])
  } finally {
    server.closeAllConnections()
    server.close()
  }
})

test('fails HTTP 400 without retrying or waiting for its body', async () => {
  const paths: string[] = []
  const server = createServer((request, response) => {
    paths.push(request.url ?? '')
    response.writeHead(400)
    response.flushHeaders()
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('missing address')
    }
    expect(
      await httpReady(
        `http://127.0.0.1:${address.port}/`,
        new AbortController().signal,
      ),
    ).toEqual(false)
    expect(paths).toEqual(['/'])
  } finally {
    server.closeAllConnections()
    server.close()
  }
})

test('retries a transient HTTP failure up to six attempts', async () => {
  const paths: string[] = []
  const server = createServer((request, response) => {
    paths.push(request.url ?? '')
    response.writeHead(503)
    response.end()
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('missing address')
    }
    expect(
      await httpReady(
        `http://127.0.0.1:${address.port}/`,
        new AbortController().signal,
      ),
    ).toEqual(false)
    expect(paths).toEqual(['/', '/', '/', '/', '/', '/'])
  } finally {
    server.closeAllConnections()
    server.close()
  }
}, 10_000)
