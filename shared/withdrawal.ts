// Widerrufsbelehrung nach dem gesetzlichen Muster (FAGG Anhang I, Fassung BGBl. I Nr. 59/2026, in Kraft seit 01.10.2026),
// ausgefüllt für die Möbelmiete von WOHNFEE. EINE Quelle für Website-Seite, Angebotsseite und E-Mails.
//
// Gewählte Gestaltungshinweise: [1] a) Dienstleistung → „des Vertragsabschlusses"; [3] Online-Widerrufsfunktion;
// [5] a) „Wir holen die Waren ab." b) „Wir tragen die Kosten der Rücksendung der Waren."; [6] anteilige Zahlung.
// ⚠ Vor dem Livegang vom WKO-Rechtsservice prüfen lassen (Einordnung Möbelmiete = Dienstleistung).

export const WITHDRAWAL_DAYS = 14

export const COMPANY = {
  name: 'Eder & Steiner GmbH (WOHNFEE)',
  address: 'Obersdorferstraße 5, 2201 Seyring, Österreich',
  addressEn: 'Obersdorferstraße 5, 2201 Seyring, Austria',
  phone: '+43 676 9202236',
  email: 'office@wohnfee.at'
}

type L = 'de' | 'en'

/** Absätze der Belehrung (reiner Text; Überschriften mit `## `) */
export function withdrawalParagraphs(lang: L): string[] {
  if (lang === 'en') {
    return [
      '## Right of withdrawal',
      'You have the right to withdraw from this contract within fourteen days without giving any reason.',
      'The withdrawal period will expire after fourteen days from the day of the conclusion of the contract.',
      `To exercise the right of withdrawal, you must inform us (${COMPANY.name}, ${COMPANY.addressEn}, phone ${COMPANY.phone}, e-mail ${COMPANY.email}) of your decision to withdraw from this contract by an unequivocal statement (e.g. a letter sent by post or e-mail). You may use the attached model withdrawal form, but it is not obligatory.`,
      'You can also exercise your right of withdrawal online using the “Withdraw from contract” button on your personal offer page (link in your offer and confirmation e-mail). If you use this online function, we will send you an acknowledgement of receipt on a durable medium (e.g. by e-mail) without delay, containing the content of the withdrawal statement and the date and time of its receipt.',
      'To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.',
      '## Effects of withdrawal',
      'If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery (with the exception of the supplementary costs resulting from your choice of a type of delivery other than the least expensive type of standard delivery offered by us), without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement.',
      'We will collect the goods. We will bear the cost of returning the goods.',
      'If you requested that the services begin during the withdrawal period, you shall pay us an amount which is in proportion to what has been provided until you have communicated to us your withdrawal from this contract, in comparison with the full coverage of the contract.'
    ]
  }
  return [
    '## Widerrufsrecht',
    'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.',
    'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.',
    `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${COMPANY.name}, ${COMPANY.address}, Telefon ${COMPANY.phone}, E-Mail ${COMPANY.email}) mittels einer eindeutigen Erklärung (z. B. mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
    'Sie können Ihr Widerrufsrecht auch online über die Schaltfläche „Vertrag widerrufen" auf Ihrer persönlichen Angebotsseite (Link in Ihrer Angebots- und Bestätigungs-E-Mail) ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.',
    'Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.',
    '## Folgen des Widerrufs',
    'Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.',
    'Wir holen die Waren ab. Wir tragen die Kosten der Rücksendung der Waren.',
    'Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.'
  ]
}

/** Muster-Widerrufsformular (unverändert laut Gesetz, Empfänger eingesetzt) */
export function withdrawalFormLines(lang: L): string[] {
  if (lang === 'en') {
    return [
      '(complete and return this form only if you wish to withdraw from the contract)',
      `– To ${COMPANY.name}, ${COMPANY.addressEn}, ${COMPANY.email}:`,
      '– I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),',
      '– Ordered on (*)/received on (*),',
      '– Name of consumer(s),',
      '– Address of consumer(s),',
      '– Signature of consumer(s) (only if this form is notified on paper),',
      '– Date',
      '(*) Delete as appropriate.'
    ]
  }
  return [
    '(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück)',
    `– An ${COMPANY.name}, ${COMPANY.address}, ${COMPANY.email}:`,
    '– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)',
    '– Bestellt am (*)/erhalten am (*)',
    '– Name des/der Verbraucher(s)',
    '– Anschrift des/der Verbraucher(s)',
    '– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)',
    '– Datum',
    '(*) Unzutreffendes streichen.'
  ]
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** HTML für Website/Mail (h2-Abschnitte; HsLegal macht daraus Karten) */
export function withdrawalHtml(lang: L, opts: { form?: boolean, h?: 'h2' | 'h3' } = {}): string {
  const h = opts.h || 'h2'
  const body = withdrawalParagraphs(lang).map(p => p.startsWith('## ')
    ? `<${h}>${esc(p.slice(3))}</${h}>` : `<p>${esc(p)}</p>`).join('\n')
  if (opts.form === false) return body
  const title = lang === 'en' ? 'Model withdrawal form' : 'Muster-Widerrufsformular'
  return `${body}\n<${h}>${title}</${h}>\n` + withdrawalFormLines(lang).map(l => `<p>${esc(l)}</p>`).join('\n')
}

/** Reiner Text für E-Mails */
export function withdrawalText(lang: L): string {
  const title = lang === 'en' ? 'MODEL WITHDRAWAL FORM' : 'MUSTER-WIDERRUFSFORMULAR'
  return withdrawalParagraphs(lang).map(p => p.startsWith('## ') ? `\n${p.slice(3).toUpperCase()}` : p).join('\n') +
    `\n\n${title}\n` + withdrawalFormLines(lang).join('\n')
}

/** Checkboxen bei Lieferung innerhalb der Widerrufsfrist (zwei getrennte Erklärungen, § 10 / § 18 Abs 1 Z 1 FAGG) */
export function earlyStartTexts(lang: L) {
  return lang === 'en'
    ? {
        request: 'I expressly request that WOHNFEE begins providing the service (delivery and rental) before the 14-day withdrawal period has expired.',
        ack: 'I acknowledge that if I withdraw, I must pay a proportionate amount for the services already provided, and that I lose my right of withdrawal once the contract has been fully performed.'
      }
    : {
        request: 'Ich verlange ausdrücklich, dass WOHNFEE vor Ablauf der 14-tägigen Widerrufsfrist mit der Leistung (Lieferung und Vermietung) beginnt.',
        ack: 'Mir ist bekannt, dass ich bei einem Widerruf einen anteiligen Betrag für die bis dahin erbrachten Leistungen zahle und mein Widerrufsrecht bei vollständiger Vertragserfüllung verliere.'
      }
}
