import 'dotenv/config'

import { initSocket } from '@/socket'
import { createServer } from 'http'
import next from 'next'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })
    const io = initSocket(httpServer)
    httpServer.listen(port, '0.0.0.0', () => {
    console.log(
        `> Server listening on port ${port} as ${dev ? 'development' : process.env.NODE_ENV}`
    )
})
})