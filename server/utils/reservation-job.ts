import { query, queryOne } from './db'
import { sendMail } from './mailer'
import { notifyTeam } from './push'
import { siteOrigin } from './site'
import { fmtDate } from './invoice-pdf'
import { REMINDER_AFTER_HOURS, ensureOfferToken } from './reservations'
import { reminderMail, acceptedMail, declinedMail, teamDecisionMail } from './offer-mails'

export const offerUrl = (origin: string, token: string) => `${origin}/angebot/${token}`

/**
 * Läuft alle 15 Minuten:
 *  - abgelaufene Reservierungen auf „abgelaufen" setzen (Möbel sind dann wieder im Shop)
 *  - Erinnerungsmail, wenn ein Mietangebot seit 48 h ohne Antwort ist
 */
export async function processReservations() {
  try {
    const expired: any[] = await query(
      `SELECT id, number FROM rental_inquiries
       WHERE reservation_status = 'aktiv' AND reserved_until <= UTC_TIMESTAMP()`
    )
    for (const r of expired) {
      await query(`UPDATE rental_inquiries SET reservation_status = 'abgelaufen' WHERE id = :id AND reservation_status = 'aktiv'`, { id: r.id })
      notifyTeam({
        title: 'Reservierung abgelaufen',
        body: `${r.number}: keine Antwort – Möbel sind wieder im Shop.`,
        url: '/admin/mietanfragen', tag: `reservation-${r.id}`
      }).catch(() => {})
    }

    const due: any[] = await query(
      `SELECT o.id, o.number, o.lang, o.valid_until, o.contact_id, c.email
       FROM offers o
       JOIN rental_inquiries r ON r.offer_id = o.id
       LEFT JOIN contacts c ON c.id = o.contact_id
       WHERE o.status = 'gesendet' AND o.reminder_sent_at IS NULL AND o.sent_at IS NOT NULL
         AND o.sent_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${REMINDER_AFTER_HOURS} HOUR)
         AND r.reservation_status = 'aktiv' AND r.reserved_until > UTC_TIMESTAMP()`
    )
    for (const o of due) {
      // als erledigt markieren, bevor gesendet wird → nie doppelt
      await query('UPDATE offers SET reminder_sent_at = UTC_TIMESTAMP() WHERE id = :id', { id: o.id })
      const to = o.email || (await queryOne<any>('SELECT email FROM rental_inquiries WHERE offer_id = :id', { id: o.id }))?.email
      if (!to) continue
      const lang = o.lang === 'en' ? 'en' : 'de'
      const mail = reminderMail({
        number: o.number, lang, rental: true,
        validStr: fmtDate(o.valid_until, lang),
        url: offerUrl(siteOrigin(), await ensureOfferToken(o.id))
      })
      await sendMail(to, mail.subject, mail.text, mail.html).catch((e) => console.error('[reservierung] Erinnerung fehlgeschlagen:', e?.message || e))
    }
  } catch (e: any) {
    console.error('[reservierung] Job fehlgeschlagen:', e?.message || e)
  }
}

/** Nach einer Kundenentscheidung: Push + Mail ans Büro + Bestätigung an den Kunden */
export async function notifyDecision(offerId: number, accepted: boolean, d: { name?: string | null; reason?: string | null }, origin: string) {
  const offer: any = await queryOne(
    `SELECT o.*, c.email AS contact_email FROM offers o LEFT JOIN contacts c ON c.id = o.contact_id WHERE o.id = :id`, { id: offerId })
  if (!offer) return
  const inquiry: any = await queryOne('SELECT email, start_date, end_date FROM rental_inquiries WHERE offer_id = :id', { id: offerId })
  const lang = offer.lang === 'en' ? 'en' : 'de'
  const customer = offer.customer_name || 'Kunde'
  notifyTeam({
    title: accepted ? `Angebot angenommen 🎉` : 'Angebot abgelehnt',
    body: `${customer} · ${offer.number}${!accepted && d.reason ? ` – „${String(d.reason).slice(0, 80)}"` : ''}`,
    url: `/admin/angebote?open=${offerId}`, tag: `offer-${offerId}`
  }).catch(() => {})
  try {
    const team = teamDecisionMail({
      number: offer.number, customer, accepted, name: d.name, reason: d.reason,
      dashboardUrl: `${origin}/admin/angebote?open=${offerId}`
    })
    await sendMail('office@wohnfee.at', team.subject, team.text, team.html)
    const to = offer.contact_email || inquiry?.email
    if (to) {
      const url = offerUrl(origin, await ensureOfferToken(offerId))
      const period = inquiry?.start_date ? `${fmtDate(inquiry.start_date, lang)} – ${fmtDate(inquiry.end_date, lang)}` : null
      const mail = accepted
        ? acceptedMail({ number: offer.number, name: d.name, period, url, lang })
        : declinedMail({ number: offer.number, lang })
      await sendMail(to, mail.subject, mail.text, mail.html)
    }
  } catch (e: any) {
    console.error('[angebot] Benachrichtigung fehlgeschlagen:', e?.message || e)
  }
}
