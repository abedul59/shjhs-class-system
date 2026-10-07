import { createHash } from 'node:crypto'
import { checkMediaRequest, clearMediaSession, privateResponse, readMediaSession, verifyMediaIdentity, writeMediaSession } from '../../utils/privateMediaAuth.js'
import { mediaClient } from '../../utils/privateMessageMedia.js'

const attempts = new Map()
export default defineEventHandler(async event => {
  privateResponse(event)
  checkMediaRequest(event)
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  if (body?.action === 'logout') {
    clearMediaSession(event)
    return { authenticated: false }
  }
  if (body?.action === 'status') {
    const identity = readMediaSession(event, config)
    return { authenticated: true, role: identity.role, studentId: identity.studentId }
  }
  if (body?.action !== 'login') throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  const key = createHash('sha256').update(`${getRequestIP(event, { xForwardedFor: true }) || 'unknown'}:${String(body.role || '')}:${String(body.studentId || '')}`).digest('hex')
  const now = Date.now()
  for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id)
  if (attempts.size >= 5000 && !attempts.has(key)) throw createError({ statusCode: 429, statusMessage: 'Try again later' })
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 }
  if (entry.count >= 10) throw createError({ statusCode: 429, statusMessage: 'Try again later' })
  entry.count++; attempts.set(key, entry)
  let identity
  try { identity = await verifyMediaIdentity(mediaClient(config), body, now) }
  catch { throw createError({ statusCode: 503, statusMessage: 'Unable to verify identity' }) }
  if (!identity) throw createError({ statusCode: 401, statusMessage: 'Identity verification failed' })
  attempts.delete(key)
  writeMediaSession(event, identity, config)
  return { authenticated: true, role: identity.role, studentId: identity.studentId }
})
