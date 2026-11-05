import { issueFormToken } from '../utils/spam'

// GET /api/form-token — Zeitstempel-Token für öffentliche Formulare (Spam-Schutz, siehe server/utils/spam.ts)
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  return { token: issueFormToken() }
})
