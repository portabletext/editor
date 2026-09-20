import * as fs from 'node:fs'
import * as http from 'node:http'
import type {AddressInfo} from 'node:net'
import * as path from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
}

export interface StaticServer {
  url: string
  close: () => Promise<void>
}

/**
 * Serve a built host dist directory with SPA fallback to index.html. Plain
 * HTTP is enough here — unlike sanity's bench (see the README), there is no
 * cross-origin API host and no concurrent-SSE-listener limit that would need
 * HTTP/2's connection multiplexing.
 */
export async function serveHostDist(distDir: string): Promise<StaticServer> {
  const root = path.resolve(distDir)
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    throw new Error(`Not a host build output (no index.html): ${root}`)
  }

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost')
    const requestedPath = path
      .normalize(requestUrl.pathname)
      .replace(/^(\.\.[/\\])+/, '')
    let filePath = path.join(root, requestedPath)
    if (
      !filePath.startsWith(root) ||
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).isDirectory()
    ) {
      filePath = path.join(root, 'index.html')
    }
    fs.readFile(filePath, (error, body) => {
      if (error) {
        response.writeHead(500)
        response.end('static server error')
        return
      }
      const contentType =
        CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream'
      response.writeHead(200, {'content-type': contentType})
      response.end(body)
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const {port} = server.address() as AddressInfo
  return {
    url: `http://localhost:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
