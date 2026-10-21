import { siteOrigin } from './site'

// Einheitliches WOHNFEE-Layout für ALLE System-Mails (Rechnungen, Angebote, Bestätigungen, Einladungen …).
// sendMail() legt es automatisch um jedes HTML, das noch kein Layout hat (Marker data-wf-mail).
// Mail-Programme ignorieren oft <style> → alles inline, Tabellen-Layout, max. 600 px breit.

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"
export const MAIL_GREEN = '#2f5d40'
const INK = '#3a3833'
const MUTED = '#8a857a'
const LINE = '#ece7dc'

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Inline-Styles für „nackte“ Tags aus den einzelnen Vorlagen (p, h1–h3, a, table, strong) */
function styleInner(html: string): string {
  return html
    .replace(/<p>/g, `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK}">`)
    .replace(/<p style="/g, `<p style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};margin:0 0 16px;`)
    .replace(/<h([123])( style="[^"]*")?>/g, (_m, n) =>
      `<h${n} style="margin:0 0 14px;font-family:${SERIF};font-weight:normal;color:${MAIL_GREEN};font-size:${n === '1' ? 24 : n === '2' ? 21 : 17}px;line-height:1.3">`)
    .replace(/<a href="(?![^"]*"[^>]*style=)([^"]*)">/g, `<a href="$1" style="color:${MAIL_GREEN};text-decoration:underline">`)
    .replace(/<strong>/g, `<strong style="color:#26241f">`)
}

/** Grüner Button (Pill) */
export function mailButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px"><tr><td style="border-radius:999px;background:${MAIL_GREEN}">` +
    `<a href="${esc(url)}" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a>` +
    `</td></tr></table>`
}

/** Info-Karte mit Zeilen „Bezeichnung – Wert“ (z. B. Rechnungsnummer, Betrag, fällig bis) */
export function mailFacts(rows: Array<[string, string]>, opts: { highlightLast?: boolean } = {}): string {
  const cells = rows.map(([k, v], i) => {
    const last = opts.highlightLast && i === rows.length - 1
    return `<tr><td style="padding:9px 0;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${FONT};font-size:13px;color:${MUTED}">${esc(k)}</td>` +
      `<td align="right" style="padding:9px 0;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${FONT};font-size:${last ? 17 : 14}px;font-weight:${last ? 700 : 600};color:${last ? MAIL_GREEN : INK}">${v}</td></tr>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;background:#f8f5ef;border-radius:14px">` +
    `<tr><td style="padding:10px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table></td></tr></table>`
}

/** Grußformel + Unterschrift */
export function mailSignature(lang: 'de' | 'en' = 'de', greeting?: string): string {
  return `<p style="margin:26px 0 0">${esc(greeting || (lang === 'en' ? 'Kind regards' : 'Mit freundlichen Grüßen'))}</p>` +
    `<p style="margin:6px 0 0;font-family:${SERIF};font-size:19px;color:${MAIL_GREEN}">Marvin Eder</p>` +
    `<p style="margin:2px 0 0;font-size:13px;color:${MUTED}">WOHNFEE Home Staging · Eder &amp; Steiner GmbH</p>`
}

export interface MailLayoutOptions {
  /** Vorschautext in der Posteingangsliste */
  preheader?: string
  /** kleiner Hinweis ganz unten (z. B. Newsletter-Abmeldung) – fertiges HTML */
  footerNote?: string
  lang?: 'de' | 'en'
}

export function wrapMail(inner: string, opts: MailLayoutOptions = {}): string {
  const origin = siteOrigin()
  const site = origin.replace(/^https?:\/\//, '')
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(opts.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>`
    : ''
  return `<!doctype html><html lang="${opts.lang || 'de'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>WOHNFEE</title></head>` +
    `<body data-wf-mail="1" style="margin:0;padding:0;background:#f1ede4;-webkit-text-size-adjust:100%">${pre}` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1ede4"><tr><td align="center" style="padding:28px 12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">` +
    // Kopf: Logo
    `<tr><td style="padding:30px 36px 18px"><a href="${esc(origin)}" style="text-decoration:none">` +
    `<img src="${esc(origin)}/mail/wohnfee-logo.png" width="200" alt="WOHNFEE Home Staging &amp; Furniture Leasing" style="display:block;width:200px;max-width:60%;height:auto;border:0;font-family:${SERIF};font-size:24px;color:${MAIL_GREEN}">` +
    `</a></td></tr>` +
    `<tr><td style="padding:0 36px"><div style="height:3px;line-height:3px;font-size:0;border-radius:3px;background:${MAIL_GREEN};background-image:linear-gradient(90deg,${MAIL_GREEN},#8cc49a)">&nbsp;</div></td></tr>` +
    // Inhalt
    `<tr><td style="padding:28px 36px 34px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK}">${styleInner(inner)}</td></tr>` +
    // Fuß
    `<tr><td style="padding:22px 36px 26px;background:#f8f5ef;border-top:1px solid ${LINE}">` +
    `<p style="margin:0 0 6px;font-family:${SERIF};font-size:16px;color:${MAIL_GREEN}">WOHNFEE</p>` +
    `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:${MUTED}">` +
    `Home Staging · Furniture Leasing · Redesign<br>Eder &amp; Steiner GmbH · Obersdorferstraße 5, 2201 Seyring<br>` +
    `<a href="mailto:office@wohnfee.at" style="color:${MAIL_GREEN};text-decoration:none">office@wohnfee.at</a> · ` +
    `<a href="tel:+436769202236" style="color:${MAIL_GREEN};text-decoration:none">+43 676 9202236</a> · ` +
    `<a href="${esc(origin)}" style="color:${MAIL_GREEN};text-decoration:none">${esc(site)}</a></p>` +
    (opts.footerNote ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:11px;line-height:1.6;color:#a8a396">${opts.footerNote}</p>` : '') +
    `</td></tr></table>` +
    `</td></tr></table></body></html>`
}

export const hasMailLayout = (html: string) => html.includes('data-wf-mail')
