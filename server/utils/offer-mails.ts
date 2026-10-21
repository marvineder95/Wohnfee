import { mailButton, mailSignature } from './mail-layout'
import { withdrawalHtml, withdrawalText, earlyStartTexts } from '../../shared/withdrawal'

// E-Mails rund um die Online-Angebotsannahme (Kunde + Team).
// Sprache folgt dem Angebot (de/en); Anrede „Sie" wie im Angebots-PDF.

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const SIGN_TEXT = '\n\nMarvin Eder\nWOHNFEE Home Staging\nEder & Steiner GmbH\noffice@wohnfee.at · +43 676 9202236'

// Logo, Fuß mit Firmendaten usw. legt sendMail() automatisch um (server/utils/mail-layout.ts)
const layout = (inner: string) => inner
const button = mailButton

type L = 'de' | 'en'
const tr = (lang: L) => (de: string, en: string) => (lang === 'en' ? en : de)

/** Angebotsmail mit Link zur Online-Annahme (PDF hängt zusätzlich an) */
export function offerMail(o: { number: string; subject?: string | null; dateStr: string; validStr: string; url: string; lang: L; rental: boolean; withdrawalUrl?: string }) {
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
    `${mailSignature(t('de', 'en') as L)}` +
    (o.rental ? `<p style="margin-top:24px;font-size:12px;color:#8a857a">${t('Für Privatkunden gilt ein 14-tägiges Widerrufsrecht', 'Private customers have a 14-day right of withdrawal')}: ` +
      `<a href="${esc(o.withdrawalUrl || '')}" style="color:#2f5d40">${t('Widerrufsbelehrung und Muster-Formular', 'withdrawal information and model form')}</a></p>` : '')
  )
  return { subject, text: text + (o.rental && o.withdrawalUrl ? `\n\n${t('Widerrufsbelehrung für Privatkunden', 'Withdrawal information for private customers')}: ${o.withdrawalUrl}` : ''), html }
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
    `<p>${esc(line3)}</p>${mailSignature(t('de', 'en') as L)}`
  )
  return { subject, text, html }
}

/** Bestätigung an den Kunden nach Annahme */
export function acceptedMail(o: { number: string; name?: string | null; period?: string | null; url: string; lang: L; privat?: boolean; earlyStart?: boolean }) {
  const t = tr(o.lang)
  const subject = t(`Auftragsbestätigung – Angebot ${o.number} angenommen`, `Confirmation – offer ${o.number} accepted`)
  const lines = [
    t(`vielen Dank für Ihr Vertrauen! Sie haben unser Angebot ${o.number} angenommen.`, `thank you for your trust! You have accepted our offer ${o.number}.`),
    o.period ? t(`Mietzeitraum: ${o.period}`, `Rental period: ${o.period}`) : '',
    t('Wir melden uns in den nächsten Tagen bei Ihnen, um den genauen Liefertermin abzustimmen.',
      'We will contact you within the next few days to arrange the exact delivery date.')
  ].filter(Boolean)
  // Privatkunden: Bestätigung auf dauerhaftem Datenträger inkl. Widerrufsbelehrung, Formular und ggf. Verlangen auf vorzeitigen Beginn
  const early = o.privat && o.earlyStart ? earlyStartTexts(o.lang) : null
  const earlyText = early ? `\n\n${t('Ihre Erklärungen bei der Annahme', 'Your statements on acceptance')}:\n✓ ${early.request}\n✓ ${early.ack}` : ''
  const wText = o.privat ? `\n\n${t('Den Vertrag können Sie auch online widerrufen („Vertrag widerrufen“ auf Ihrer Angebotsseite)', 'You can also withdraw online ("Withdraw from contract" on your offer page)')}: ${o.url}\n${withdrawalText(o.lang)}` : ''
  const text = `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n${lines.join('\n')}\n\n${t('Ihr Angebot', 'Your offer')}: ${o.url}${earlyText}\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}${SIGN_TEXT}${wText}`
  const html = layout(
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p>` + lines.map(l => `<p>${esc(l)}</p>`).join('') +
    button(o.url, t('Angebot ansehen', 'View offer')) +
    (early ? `<p style="font-size:14px"><strong>${t('Ihre Erklärungen bei der Annahme', 'Your statements on acceptance')}:</strong><br>✓ ${esc(early.request)}<br>✓ ${esc(early.ack)}</p>` : '') +
    `${mailSignature(t('de', 'en') as L)}` +
    (o.privat ? `<div style="margin-top:26px;padding:16px 18px;border:1px solid #ece7dc;border-radius:12px;font-size:13px;line-height:1.55;color:#5e584b">` +
      withdrawalHtml(o.lang, { h: 'h3' }).replace(/<h3>/g, '<h3 style="font-size:15px;color:#26492f;margin:14px 0 6px">') + '</div>' : '')
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
  const html = layout(`<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p><p>${esc(line)}</p>${mailSignature(t('de', 'en') as L)}`)
  return { subject, text, html }
}

/** Info an office@ über die Entscheidung des Kunden */
export function teamDecisionMail(o: { number: string; customer: string; accepted: boolean; name?: string | null; reason?: string | null; dashboardUrl: string }) {
  const subject = `${o.accepted ? '✅ Angenommen' : '❌ Abgelehnt'}: Angebot ${o.number} – ${o.customer}`
  const lines = [
    `${o.customer} hat das Angebot ${o.number} online ${o.accepted ? 'angenommen' : 'abgelehnt'}.`,
    o.name ? `Bestätigt von: ${o.name}` : '',
    o.reason ? `Grund: ${o.reason}` : '',
    o.accepted ? 'Automatisch angelegt: Projekt mit den Möbeln, Liefertermin im Kalender sowie Rechnungsentwürfe (Monat 1, einmalige Leistungen) und das Monats-Abo – bitte unter „Rechnungen" prüfen und versenden.' : 'Die reservierten Möbel sind wieder im Shop verfügbar.'
  ].filter(Boolean)
  const text = `${lines.join('\n')}\n\n${o.dashboardUrl}`
  const html = layout(lines.map(l => `<p>${esc(l)}</p>`).join('') + button(o.dashboardUrl, 'Im Dashboard öffnen'))
  return { subject, text, html }
}

/** Eingangsbestätigung Online-Widerruf (§ 13a Abs 5 FAGG): Inhalt, Datum, Uhrzeit */
export function withdrawalReceiptMail(o: { number: string; name: string; email: string; at: Date; lang: L; delivered: boolean }) {
  const t = tr(o.lang)
  const when = o.at.toLocaleString(o.lang === 'en' ? 'en-GB' : 'de-AT', { timeZone: 'Europe/Vienna', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const subject = t(`Eingangsbestätigung Ihres Widerrufs – Vertrag ${o.number}`, `Acknowledgement of your withdrawal – contract ${o.number}`)
  const content = [
    t(`Erklärung: Hiermit widerrufe ich den Vertrag ${o.number} (Möbelmiete).`, `Statement: I hereby withdraw from contract ${o.number} (furniture rental).`),
    `${t('Name', 'Name')}: ${o.name}`,
    `${t('E-Mail für die Bestätigung', 'E-mail for the acknowledgement')}: ${o.email}`,
    `${t('Eingegangen am', 'Received on')}: ${when}`
  ]
  const next = o.delivered
    ? t('Wir melden uns, um die Abholung der Möbel zu vereinbaren. Die Kosten der Rücksendung tragen wir.', 'We will contact you to arrange collection of the furniture. We bear the cost of returning it.')
    : t('Die Lieferung findet nicht statt. Bereits geleistete Zahlungen erstatten wir binnen 14 Tagen.', 'The delivery will not take place. Any payments already made will be refunded within 14 days.')
  const text = `${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},\n\n${t('wir bestätigen den Eingang Ihres Widerrufs:', 'we confirm receipt of your withdrawal:')}\n\n${content.join('\n')}\n\n${next}\n\n${t('Mit freundlichen Grüßen', 'Kind regards')}${SIGN_TEXT}`
  const html = layout(
    `<p>${t('Sehr geehrte Damen und Herren', 'Dear Sir or Madam')},</p><p>${t('wir bestätigen den Eingang Ihres Widerrufs:', 'we confirm receipt of your withdrawal:')}</p>` +
    `<p style="background:#f3efe6;border-radius:12px;padding:12px 16px">${content.map(esc).join('<br>')}</p>` +
    `<p>${esc(next)}</p>${mailSignature(t('de', 'en') as L)}`
  )
  return { subject, text, html }
}
