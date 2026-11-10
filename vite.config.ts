import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { GET } from './api/vinmonopolet.ts'

export default defineConfig({
  plugins: [react(), {
    name: 'vinmonopolet-api',
    configureServer(server) {
      server.middlewares.use('/api/vinmonopolet', async (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405).end()
          return
        }
        const response = await GET(new Request(new URL(req.url || '/', 'http://localhost')))
        res.writeHead(response.status, Object.fromEntries(response.headers))
        res.end(await response.text())
      })
    },
  }],
})
