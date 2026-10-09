import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

// Liefert zur Laufzeit hochgeladene Dateien (Inventar, Avatare, Blog) aus
// public/uploads aus. Nötig, weil ein gebauter Nuxt-Server nur die beim Build
// vorhandenen public-Dateien kennt – neue Uploads wären sonst nicht erreichbar.
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'
}

export default defineEventHandler(async (event) => {
  const root = join(process.cwd(), 'public', 'uploads')
  const rel = decodeURIComponent(String(getRouterParam(event, 'path') || ''))
  const file = normalize(join(root, rel))
  const type = TYPES[extname(file).toLowerCase()]
  if (!type || !file.startsWith(root + sep)) throw createError({ statusCode: 404 })

  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404 })

  setResponseHeaders(event, {
    'content-type': type,
    'content-length': String(info.size),
    'cache-control': 'public, max-age=604800'
  })
  return sendStream(event, createReadStream(file))
})
