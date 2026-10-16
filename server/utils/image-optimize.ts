import sharp from 'sharp'

// Hochgeladene Fotos gleich in Web-Qualität speichern: nach EXIF drehen (Handyfotos), auf die
// Maximalgröße des Einsatzzwecks verkleinern (nie vergrößern), Metadaten entfernen (u. a. GPS-Standort)
// und komprimieren. PNG mit Transparenz (Logos) bleibt PNG, sonst wird JPEG gespeichert; WebP bleibt WebP.
// Schlägt die Verarbeitung fehl, wird das Original gespeichert – ein Upload scheitert daran nie.
export type ImagePreset = 'inventory' | 'photo' | 'large' | 'logo' | 'avatar'

const PRESETS: Record<ImagePreset, { max: number; quality: number }> = {
  inventory: { max: 1200, quality: 80 }, // Inventar & Shop
  photo: { max: 1600, quality: 82 },     // Mietpakete
  large: { max: 1920, quality: 82 },     // Blog-Titelbilder, Immobilien (auch für willhaben)
  logo: { max: 800, quality: 85 },       // Partner-/Referenz-Logos
  avatar: { max: 400, quality: 85 }      // Profilbilder
}
const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

/** Max. Upload-Größe vor dem Verkleinern (Handyfotos haben oft 5–15 MB) */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export async function optimizeImage(data: Buffer, mime: string, preset: ImagePreset): Promise<{ data: Buffer; ext: string }> {
  const { max, quality } = PRESETS[preset]
  const fallback = { data, ext: EXT[mime] || '.jpg' }
  try {
    const img = sharp(data, { failOn: 'none' }).rotate() // EXIF-Ausrichtung anwenden
    const meta = await img.metadata()
    img.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    if (mime === 'image/webp') return { data: await img.webp({ quality }).toBuffer(), ext: '.webp' }
    if (mime === 'image/png' && meta.hasAlpha) return { data: await img.png({ compressionLevel: 9, palette: true, quality }).toBuffer(), ext: '.png' }
    // JPEG (auch PNG-Fotos ohne Transparenz) – auf weißem Grund
    const out = await img.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
    // nie größer speichern als das Original (z. B. bereits optimierte kleine JPEGs)
    return mime === 'image/jpeg' && out.length >= data.length && (meta.width || 0) <= max && (meta.height || 0) <= max
      ? fallback : { data: out, ext: '.jpg' }
  } catch (e) {
    console.error('[image-optimize] Verarbeitung fehlgeschlagen, Original gespeichert:', (e as Error)?.message)
    return fallback
  }
}
