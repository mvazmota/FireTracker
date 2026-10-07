import { Hono } from 'hono'
import { createAuth } from './auth.js'
import { api } from './routes.js'

const app = new Hono()

// One auth instance per request, shared by the auth handler and the API.
app.use('*', async (c, next) => {
  c.set('auth', createAuth(c.env))
  await next()
})

// Better Auth owns everything under /api/auth.
app.on(['GET', 'POST'], '/api/auth/*', (c) => c.get('auth').handler(c.req.raw))

app.route('/api', api)

export default app
