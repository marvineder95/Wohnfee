import { createHash } from 'node:crypto'
import { query, queryOne } from '../../../utils/db'
import { sendMail } from '../../../utils/mailer'
import { clientIp, assertNotLimited, countAttempt } from '../../../utils/rate-limit'
import { publicOrigin } from '../../../utils/site'

// POST /api/properties/:slug/inquiry – Besichtigung/Infos anfragen → landet in „Anfragen" (mit Immobilie verknüpft)
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (String(body?.website || '')) return { ok: true } // Honeypot
  const en = body?.lang === 'en'
  const m = (de: string, e: string) => (en ? e : de)
  const key = `property-inquiry:${clientIp(event)}`
  assertNotLimited(key, 5, 60 * 60 * 1000)

  const slug = String(getRouterParam(event, 'slug') || '')
  const p: any = await queryOne(`SELECT id, title, ref_no, contact_email FROM properties WHERE slug = :slug AND status IN ('aktiv','reserviert')`, { slug })
  if (!p) throw createError({ statusCode: 404, statusMessage: m('Diese Immobilie ist nicht mehr verfügbar.', 'This property is no longer available.') })

  const name = String(body?.name || '').trim().slice(0, 128)
  const email = String(body?.email || '').trim().slice(0, 190)
  const phone = String(body?.phone || '').trim().slice(0, 64)
  const message = String(body?.message || '').trim().slice(0, 5000)
  if (!name) throw createError({ statusCode: 400, statusMessage: m('Bitte geben Sie Ihren Namen an.', 'Please enter your name.') })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw createError({ statusCode: 400, statusMessage: m('Bitte eine gültige E-Mail-Adresse angeben.', 'Please enter a valid e-mail address.') })
  if (!body?.privacy) throw createError({ statusCode: 400, statusMessage: m('Bitte bestätigen Sie die Datenschutzerklärung.', 'Please confirm the privacy policy.') })
  countAttempt(key, 60 * 60 * 1000)

  const wish = body?.viewing ? m('Besichtigungstermin gewünscht', 'Viewing requested') : m('Informationen gewünscht', 'Information requested')
  const subject = `Immobilie: ${p.title}${p.ref_no ? ` (${p.ref_no})` : ''}`.slice(0, 190)
  const text = `${wish}.\n\n${message || '–'}`
  const ipHash = createHash('sha256').update(`wf-contact:${clientIp(event)}`).digest('hex')
  const res: any = await query(
    `INSERT INTO contact_inquiries (name, email, phone, subject, message, ip_hash, property_id) VALUES (:name, :email, :phone, :subject, :text, :ip, :pid)`,
    { name, email, phone: phone || null, subject, text, ip: ipHash, pid: p.id })

  const url = `${publicOrigin(event)}/admin/immobilien?open=${p.id}`
  const to = ['office@wohnfee.at', p.contact_email].filter((v, i, a) => v && a.indexOf(v) === i).join(', ')
  sendMail(to, `Anfrage zu ${subject}`, `${name} <${email}> ${phone}\n${text}\n\n${url}`,
    `<p><strong>${name.replace(/</g, '&lt;')}</strong> &lt;${email.replace(/</g, '&lt;')}&gt; ${phone.replace(/</g, '&lt;')}</p><p>${text.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p><p><a href="${url}">Im Dashboard öffnen</a></p>`)
    .catch((e: any) => console.error('[immobilie] Mail fehlgeschlagen:', e?.message || e))
  import('../../../utils/push').then(({ notifyTeam }) => notifyTeam({
    title: 'Anfrage zu Immobilie', body: `${name} · ${p.title}`, url: '/admin/anfragen', tag: `contact-${res.insertId}`
  })).catch(() => {})
  return { ok: true }
})
