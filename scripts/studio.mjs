import sharp from 'sharp'
// Aufruf: [MAXSCALE=2] node scripts/studio.mjs <freigestellt.png> <ausgabe.jpg> floor|hang|wall
// Freistellen vorher z. B. mit macOS Vision (VNGenerateForegroundInstanceMaskRequest) oder Weiß-Herausrechnen.
// Studio-Hintergrund im WOHNFEE-Ton + freigestelltes Motiv + weicher Schatten → 1200×1200 JPG
const [input, output, mode] = process.argv.slice(2) // mode: floor | hang | wall
const W = 1200
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#f7f2ea"/><stop offset=".6" stop-color="#ece4d7"/><stop offset="1" stop-color="#ddd2c1"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#7a6648" stop-opacity=".10"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect y="${W * 0.72}" width="100%" height="${W * 0.28}" fill="url(#floor)"/>
</svg>`
const subj = sharp(input)
const meta = await subj.metadata()
const box = mode === 'hang' ? { w: W * 0.74, h: W * 0.86 } : mode === 'wall' ? { w: W * 0.56, h: W * 0.56 } : { w: W * 0.82, h: W * 0.66 }
const scale = Math.min(box.w / meta.width, box.h / meta.height, Number(process.env.MAXSCALE || 99))
const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale)
const obj = await sharp(input).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()
const left = Math.round((W - w) / 2)
const top = mode === 'hang' ? 0 : mode === 'wall' ? Math.round((W - h) / 2) : Math.round(W * 0.86 - h)
const layers = []
if (mode === 'floor') {
  // Kontaktschatten am Boden
  const sh = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}"><ellipse cx="${W / 2}" cy="${top + h - 4}" rx="${w * 0.52}" ry="${Math.max(14, w * 0.035)}" fill="#4a3b26" fill-opacity=".30"/></svg>`
  layers.push({ input: await sharp(Buffer.from(sh)).blur(18).png().toBuffer(), top: 0, left: 0 })
} else {
  // weicher Schlagschatten aus der Motiv-Silhouette
  const alpha = await sharp(obj).extractChannel('alpha').toBuffer()
  const pad = 80
  const shadow = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 74, g: 59, b: 38 } } })
    .joinChannel(await sharp(alpha).linear(0.22, 0).toBuffer()).png().toBuffer()
  const blurred = await sharp(shadow).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(26).png().toBuffer()
  layers.push({ input: blurred, top: top - pad + (mode === 'wall' ? 22 : 30), left: left - pad + 10 })
}
layers.push({ input: obj, top, left })
await sharp(Buffer.from(bgSvg)).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toFile(output)
console.log('ok', output, w, h)
