// Serve a directory over HTTP for the test pages, with one log line per request.
//
// Usage: node scripts/serve.ts <dir> <port>

import {createReadStream, statSync} from 'node:fs'
import http from 'node:http'
import {extname, join, normalize, sep} from 'node:path'

const root = normalize(process.argv[2]!)
const port = Number(process.argv[3])

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url ?? '/', 'http://localhost').pathname,
  )
  let path = normalize(join(root, pathname))
  let status = 200
  try {
    if (
      path !== root &&
      !path.startsWith(root.endsWith(sep) ? root : root + sep)
    )
      throw new Error('outside root')
    if (statSync(path).isDirectory()) path = join(path, 'index.html')
    const size = statSync(path).size
    response.writeHead(200, {
      'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
      'content-length': size,
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(path).pipe(response)
  } catch {
    status = 404
    response.writeHead(404, {'content-type': 'text/plain'})
    response.end('not found')
  }
  console.log(
    `${request.socket.remoteAddress?.replace(/^::ffff:/, '')} - - [${stamp()}] "${request.method} ${request.url} HTTP/${request.httpVersion}" ${status} -`,
  )
})

server.listen(port, () =>
  console.log(
    `Serving HTTP on 0.0.0.0 port ${port} (http://0.0.0.0:${port}/) ...`,
  ),
)

function stamp(): string {
  const now = new Date()
  const month = now.toLocaleString('en-US', {month: 'short'})
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(now.getDate())}/${month}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
