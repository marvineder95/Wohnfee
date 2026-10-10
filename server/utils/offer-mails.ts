// E-Mails rund um die Online-Angebotsannahme (Kunde + Team).
// Sprache folgt dem Angebot (de/en); Anrede „Sie" wie im Angebots-PDF.

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const SIGN_TEXT = '\n\nMarvin Eder\nWOHNFEE Home Staging\nEder & Steiner GmbH\noffice@wohnfee.at · +43 676 9202236'
const SIGN_HTML = '<strong>Marvin Eder</strong><br>WOHNFEE Home Staging<br>Eder &amp; Steiner GmbH<br>' +
  '<a href="mailto:office@wohnfee.at" style="color:#2f5d40">office@wohnfee.at</a> · +43 676 9202236'

function layout(inner: string) {
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:580px;margin:0 auto;padding:28px 24px;color:#3f3c35;line-height:1.55">` +
    `<p style="font-size:22px;letter-spacing:.04em;color:#26492f;margin:0 0 22px">WOHN<span style="color:#7fa07a">FEE</span></p>` +
    inner +
    `<p style="font-size:12px;color:#a8a396;margin-top:28px;border-top:1px solid #ece7dc;padding-top:12px">` +
    `WOHNFEE – Eder &amp; Steiner GmbH · Obersdorferstraße 5, 2201 Seyring</p></div>`
}

function button(url: string, label: string) {
  return `<p style="margin:22px 0"><a href="${esc(url)}" style="display:inline-block;background:#2f5d40;color:#fff;` +
    `padding:13px 28px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${esc(label)}</a></p>`
}

type L = 'de' | 'en'
const tr = (lang: L) => (de: string, en: string) => (lang === 'en' ? en : de)

/** Angebotsmail mit Link zur Online-Annahme (PDF hängt zusätzlich an) */
export function offerMail(o: { number: string; subject?: string | null; dateStr: string; validStr: string; url: string; lang: L; rental: boolean }) {
  const t = tr(o.lang)
  const subject = `${t('Ihr Angebot', 'Your offer')} ${o.number}${o.subject ? ` – ${o.subject}` : ''} – WOHNFEE`
  const hold = o.rental
    ? t(`Die Möbel sind bis ${o.validStr} exklusiv für Sie reserviert.`, `The furniture is reserved exclusively for you until ${o.validStr}.`)
    : ''
  const text =
    `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n` +
    t(`vielen Dank für Ihre Anfrage! Anbei erhalten Sie unser Angebot ${o.number} vom ${o.dateStr}${o.validStr ? ` (gültig bis ${o.validStr})` : ''}.`,
      `thank you for your inquiry! Please find attached our offer ${o.number} dated ${o.dateStr}${o.validStr ? ` (valid until ${o.validStr})` : ''}.`) +
    (hold ? `\n${hold}` : '') +
    `\n\n${t('Angebot ansehen und mit einem Klick annehmen oder ablehnen:', 'View the offer and accept or decline it with one click:')}\n${o.url}\n\n` +
    t('Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.', 'If you have any questions, please do not hesitate to contact us.') +
    `\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}` + SIGN_TEXT
  const html = layout(
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p>` +
    `<p>${t(`vielen Dank für Ihre Anfrage! Anbei erhalten Sie unser Angebot <strong>${esc(o.number)}</strong> vom ${esc(o.dateStr)}${o.validStr ? ` (gültig bis ${esc(o.validStr)})` : ''}.`,
      `thank you for your inquiry! Please find attached our offer <strong>${esc(o.number)}</strong> dated ${esc(o.dateStr)}${o.validStr ? ` (valid until ${esc(o.validStr)})` : ''}.`)}</p>` +
    (hold ? `<p style="background:#f3efe6;border-radius:12px;padding:12px 16px">${esc(hold)}</p>` : '') +
    `<p>${t('Sie können das Angebot online ansehen und direkt annehmen oder ablehnen:', 'You can view the offer online and accept or decline it right away:')}</p>` +
    button(o.url, t('Angebot ansehen', 'View offer')) +
    `<p>${t('Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.', 'If you have any questions, please do not hesitate to contact us.')}</p>` +
    `<p>${t('Mit freundlichen Grüßen', 'Kind regards')}<br>${SIGN_HTML}</p>`
  )
  return { subject, text, html }
}

/** Freundliche Erinnerung nach 2 Tagen ohne Antwort */
export function reminderMail(o: { number: string; validStr: string; url: string; lang: L; rental: boolean }) {
  const t = tr(o.lang)
  const subject = t(`Kurze Erinnerung: Ihr Angebot ${o.number}`, `Quick reminder: your offer ${o.number}`)
  const line1 = t(
    `wir wollten kurz nachfragen, ob Sie schon Gelegenheit hatten, sich unser Angebot ${o.number} anzusehen.`,
    `we just wanted to check whether you have had a chance to look at our offer ${o.number}.`)
  const line2 = o.rental
    ? t(`Die Möbel halten wir noch bis ${o.validStr} für Sie reserviert – danach geben wir sie wieder für andere Anfragen frei.`,
      `We are holding the furniture for you until ${o.validStr} – after that it becomes available to others again.`)
    : t(`Das Angebot ist gültig bis ${o.validStr}.`, `The offer is valid until ${o.validStr}.`)
  const line3 = t('Falls noch etwas offen ist oder Sie etwas anpassen möchten, antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.',
    'If anything is unclear or you would like to change something, simply reply to this e-mail or give us a call.')
  const text = `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n${line1}\n${line2}\n\n${o.url}\n\n${line3}\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}${SIGN_TEXT}`
  const html = layout(
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p><p>${esc(line1)}</p>` +
    `<p style="background:#f3efe6;border-radius:12px;padding:12px 16px">${esc(line2)}</p>` +
    button(o.url, t('Angebot ansehen', 'View offer')) +
    `<p>${esc(line3)}</p><p>${t('Mit freundlichen Grüßen', 'Kind regards')}<br>${SIGN_HTML}</p>`
  )
  return { subject, text, html }
}

/** Bestätigung an den Kunden nach Annahme */
export function acceptedMail(o: { number: string; name?: string | null; period?: string | null; url: string; lang: L }) {
  const t = tr(o.lang)
  const subject = t(`Auftragsbestätigung – Angebot ${o.number} angenommen`, `Confirmation – offer ${o.number} accepted`)
  const lines = [
    t(`vielen Dank für Ihr Vertrauen! Sie haben unser Angebot ${o.number} angenommen.`, `thank you for your trust! You have accepted our offer ${o.number}.`),
    o.period ? t(`Mietzeitraum: ${o.period}`, `Rental period: ${o.period}`) : '',
    t('Wir melden uns in den nächsten Tagen bei Ihnen, um den genauen Liefertermin abzustimmen.',
      'We will contact you within the next few days to arrange the exact delivery date.')
  ].filter(Boolean)
  const text = `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n${lines.join('\n')}\n\n${t('Ihr Angebot', 'Your offer')}: ${o.url}\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}${SIGN_TEXT}`
  const html = layout(
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p>` + lines.map(l => `<p>${esc(l)}</p>`).join('') +
    button(o.url, t('Angebot ansehen', 'View offer')) +
    `<p>${t('Mit freundlichen Grüßen', 'Kind regards')}<br>${SIGN_HTML}</p>`
  )
  return { subject, text, html }
}

/** Kurze Rückmeldung an den Kunden nach Ablehnung */
export function declinedMail(o: { number: string; lang: L }) {
  const t = tr(o.lang)
  const subject = t(`Ihre Rückmeldung zu Angebot ${o.number}`, `Your reply to offer ${o.number}`)
  const line = t('vielen Dank für Ihre Rückmeldung – schade, dass es diesmal nicht passt. Wenn wir Ihnen ein angepasstes Angebot machen dürfen, melden Sie sich jederzeit gerne bei uns.',
    'thank you for letting us know – a pity it does not fit this time. If you would like an adjusted offer, feel free to get in touch at any time.')
  const text = `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n${line}\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}${SIGN_TEXT}`
  const html = layout(`<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p><p>${esc(line)}</p><p>${t('Mit freundlichen Grüßen', 'Kind regards')}<br>${SIGN_HTML}</p>`)
  return { subject, text, html }
}

/** Info an office@ über die Entscheidung des Kunden */
export function teamDecisionMail(o: { number: string; customer: string; accepted: boolean; name?: string | null; reason?: string | null; dashboardUrl: string }) {
  const subject = `${o.accepted ? '✅ Angenommen' : '❌ Abgelehnt'}: Angebot ${o.number} – ${o.customer}`
  const lines = [
    `${o.customer} hat das Angebot ${o.number} online ${o.accepted ? 'angenommen' : 'abgelehnt'}.`,
    o.name ? `Bestätigt von: ${o.name}` : '',
    o.reason ? `Grund: ${o.reason}` : '',
    o.accepted ? 'Ein Projekt mit den Möbeln und ein Liefertermin wurden automatisch angelegt.' : 'Die reservierten Möbel sind wieder im Shop verfügbar.'
  ].filter(Boolean)
  const text = `${lines.join('\n')}\n\n${o.dashboardUrl}`
  const html = layout(lines.map(l => `<p>${esc(l)}</p>`).join('') + button(o.dashboardUrl, 'Im Dashboard öffnen'))
  return { subject, text, html }
}
