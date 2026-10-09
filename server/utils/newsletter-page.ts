// Kleine, eigenständige HTML-Seite für Bestätigung/Abmeldung (Links aus E-Mails)
export function newsletterPage(opts: { title: string; text: string; lang: 'de' | 'en'; form?: { action: string; button: string } }) {
  const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  const home = opts.lang === 'en' ? '/en/furniture-leasing.html' : '/start.html'
  return `<!doctype html><html lang="${opts.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(opts.title)} – WOHNFEE</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f5ef;font-family:Georgia,'Times New Roman',serif;color:#2b2b28;padding:16px;box-sizing:border-box}
.card{max-width:460px;background:#fff;border:1px solid #e6e0d2;border-radius:22px;padding:36px 32px;text-align:center}
.logo{font-size:22px;letter-spacing:.06em;color:#2f5d40;margin:0 0 18px}h1{font-weight:500;font-size:26px;margin:0 0 12px}
p{color:#5f5b52;line-height:1.6;font-family:system-ui,sans-serif;font-size:15px}
.btn{display:inline-block;margin-top:14px;background:#2f5d40;color:#fff;border:0;border-radius:999px;padding:12px 26px;font:600 15px system-ui,sans-serif;text-decoration:none;cursor:pointer}
.link{display:inline-block;margin-top:18px;color:#2f5d40;font:600 14px system-ui,sans-serif}
</style></head><body><main class="card"><p class="logo">WOHNFEE</p><h1>${esc(opts.title)}</h1><p>${esc(opts.text)}</p>
${opts.form ? `<form method="post" action="${esc(opts.form.action)}"><button class="btn" type="submit">${esc(opts.form.button)}</button></form>` : ''}
<a class="link" href="${home}">${opts.lang === 'en' ? 'To the website' : 'Zur Website'} →</a></main></body></html>`
}
