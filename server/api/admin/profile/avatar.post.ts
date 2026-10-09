import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../utils/admin-auth'
import { query, queryOne } from '../../../utils/db'

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/admin/profile/avatar — eigenes Profilbild hochladen (multipart, Feld "file")
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const me: any = await queryOne('SELECT id, avatar_path FROM admin_users WHERE id = :id', { id: user.id })
  if (!me) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei erhalten' })

  const ext = MIME_EXT[file.type || '']
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Nur JPEG, PNG oder WebP erlaubt' })
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Datei zu groß (max. 5 MB)' })
  }

  const dir = join(process.cwd(), 'public', 'uploads', 'avatars')
  await mkdir(dir, { recursive: true })
  const fname = `user-${user.id}${ext}`
  await writeFile(join(dir, fname), file.data)

  // alte Datei mit abweichender Endung aufräumen
  const old = me.avatar_path ? String(me.avatar_path) : ''
  if (old && !old.endsWith(fname)) {
    try { await unlink(join(process.cwd(), 'public', old.replace(/^\//, ''))) } catch { /* Datei schon weg */ }
  }

  const avatarPath = `/uploads/avatars/${fname}`
  await query('UPDATE admin_users SET avatar_path = :p WHERE id = :id', { p: avatarPath, id: user.id })
  return { avatarPath }
})
