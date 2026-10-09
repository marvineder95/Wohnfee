import PDFDocument from 'pdfkit'
import { fmtAmount, fmtDate, getFonts, parseBold } from './invoice-pdf'

const GREEN = '#317046'
const DARK = '#2b2b2b'
const GRAY = '#666666'
const LIGHT = '#eef3ef'
const RULE = '#d8e5dc'

// Baut das Angebots-PDF im WOHNFEE-Design (Montserrat, volle Seitenbreite,
// gleiche Gestaltung wie die Rechnung) und liefert es als Buffer.
export async function buildOfferPdf(offer: any, items: any[], logoPng: Buffer | null): Promise<Buffer> {
  const lang: string = offer.lang === 'en' ? 'en' : 'de'
  const t = (de: string, en: string) => (lang === 'en' ? en : de)

  const F = await getFonts()
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Angebot ${offer.number}`, Author: 'Eder & Steiner GmbH' } })
  doc.registerFont('wf', F.reg)
  doc.registerFont('wf-med', F.med)
  doc.registerFont('wf-semi', F.semi)
  doc.registerFont('wf-bold', F.bold)
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<void>((resolve) => doc.on('end', () => resolve()))

  const W = 595.28, H = 841.89, M = 46, CW = W - 2 * M
  const font = (style: 'reg' | 'med' | 'semi' | 'bold' | 'italic' = 'reg') =>
    style === 'bold' ? 'wf-bold' : style === 'semi' ? 'wf-semi' : style === 'med' ? 'wf-med' : 'wf'

  // Freitext mit **fett**-Unterstuetzung; Absaetze explizit getrennt.
  function richText(yStart: number, text: string, width: number, size = 9.5, color: string = DARK): number {
    const paras = String(text).split(/\n+/).filter((p) => p.trim().length)
    if (!paras.length) return yStart
    const paraGap = size * 0.6
    const measure = (f: string) =>
      paras.reduce((sum, p) => sum + doc.heightOfString(p, { width, font: f, fontSize: size, lineGap: 3 }), 0)
      + paraGap * (paras.length - 1)
    const h = Math.max(measure(font('med')), measure(font('bold')))
    if (yStart + h > H - 170) { doc.addPage(); yStart = 60 }
    let endY = yStart
    for (const para of paras) {
      const parts = parseBold(para)
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        doc.font(p.bold ? font('bold') : font('med')).fontSize(size).fillColor(color)
        const opts: any = { width, fontSize: size, lineGap: 3, continued: i < parts.length - 1 }
        if (i === 0) doc.text(p.text, M, endY, opts)
        else doc.text(p.text, opts)
      }
      endY = doc.y + paraGap
    }
    doc.fillColor(DARK)
    return Math.max(yStart + h, endY - paraGap)
  }

  function footer() {
    const y = H - 56
    doc.moveTo(M, y - 10).lineTo(W - M, y - 10).lineWidth(0.6).strokeColor(RULE).stroke()
    doc.font(font()).fontSize(7.3).fillColor(GRAY)
    doc.text('Eder & Steiner GmbH · Obersdorferstraße 5, 2201 Seyring, Österreich · +43 660 977 81 57 · office@es-gmbh.at · www.es-gmbh.at', M, y, { width: CW, align: 'center' })
    doc.text('UID-Nr: ATU82726169 · Steuer-Nr.: 03 797/5380 · FN 665860G · Firmenbuchgericht: Landesgericht Korneuburg', M, y + 11, { width: CW, align: 'center' })
    doc.text('Bank: Raiffeisenbank Mödling · IBAN: AT62 3225 0000 0165 1082 · BIC: RLNWATWWGTD', M, y + 22, { width: CW, align: 'center' })
    doc.fillColor(DARK)
  }
  doc.on('pageAdded', () => footer())

  // ---------- Kopf ----------
  // WOHNFEE-Logo (oben links; enthaelt bereits die Zeile "Home Staging | Furniture Leasing")
  if (logoPng) {
    doc.image(logoPng, M, 44, { height: 66 })
  } else {
    doc.font(font('semi')).fontSize(26).fillColor(GREEN)
    doc.text('WOHNFEE', M, 56, { characterSpacing: 1.5 })
  }
  doc.font(font()).fontSize(7.2).fillColor(GRAY)
  doc.text('Ein Unternehmen der Eder & Steiner GmbH', M, 118)

  // Angebots-Titel rechts: klein + Nummer
  doc.font(font('semi')).fontSize(11).fillColor(DARK)
  doc.text(t('ANGEBOT', 'OFFER'), M, 52, { width: CW, align: 'right', characterSpacing: 1.6 })
  doc.font(font('bold')).fontSize(12.5).fillColor(GREEN)
  doc.text(String(offer.number), M, 68, { width: CW, align: 'right' })

  doc.moveTo(M, 134).lineTo(W - M, 134).lineWidth(1.4).strokeColor(GREEN).stroke()

  // ---------- Kundenblock + Meta ----------
  let y = 156
  const custW = 250 // garantierter Freiraum zum Meta-Block rechts
  doc.font(font('bold')).fontSize(10.5).fillColor(DARK)
  doc.text(String(offer.customer_name), M, y, { width: custW })
  let cy = y + doc.heightOfString(String(offer.customer_name), { width: custW }) + 2
  doc.font(font()).fontSize(10).fillColor(DARK)
  const addrLines = [offer.customer_street, [offer.customer_zip, offer.customer_city].filter(Boolean).join(' '),
    offer.customer_country, offer.customer_uid].filter(Boolean)
  for (const l of addrLines) {
    doc.text(String(l), M, cy, { width: custW })
    cy += 14.5
  }

  const metaX = W - M - 200
  const meta: Array<[string, string]> = [
    [t('Angebotsdatum', 'Offer date'), fmtDate(offer.doc_date, lang)],
    [t('Gültig bis', 'Valid until'), fmtDate(offer.valid_until, lang) || '—'],
    [t('Kundennummer', 'Customer no.'), offer.contact_id ? `WF-${String(offer.contact_id).padStart(4, '0')}` : '—']
  ]
  let my = y
  for (const [label, value] of meta) {
    doc.font(font()).fontSize(8).fillColor(GRAY).text(label, metaX, my, { width: 82 })
    doc.font(font('bold')).fontSize(9.5).fillColor(DARK).text(value || '—', metaX + 84, my - 1, { width: 116 })
    my += Math.max(16, doc.heightOfString(value || '—', { width: 116 }) + 5)
  }

  // ---------- Betreff ----------
  y = Math.max(cy, my) + 22
  if (offer.subject) {
    doc.font(font('semi')).fontSize(11).fillColor(DARK)
    doc.text(String(offer.subject), M, y, { width: CW })
    y += doc.heightOfString(String(offer.subject), { width: CW }) + 14
  } else {
    y += 8
  }

  // ---------- Positionen ----------
  const cols = { pos: M, desc: M + 34, qty: M + CW - 212, price: M + CW - 132, total: M + CW - 76 }
  const tableW = CW

  function pageBreakIf(need: number) {
    if (y + need > H - 170) {
      doc.addPage()
      y = 60
      doc.font(font('semi')).fontSize(8.5).fillColor(GRAY)
      doc.text(t('Pos.', 'No.'), cols.pos, y)
      doc.text(t('Leistung', 'Description'), cols.desc, y)
      doc.text(t('Menge', 'Qty'), cols.qty, y, { width: 46, align: 'right' })
      doc.text(t('Einzelpreis', 'Unit price'), cols.price, y, { width: 72, align: 'right' })
      doc.text(t('Gesamt', 'Total'), cols.total, y, { width: 76, align: 'right' })
      y += 16
      doc.moveTo(M, y - 5).lineTo(W - M, y - 5).lineWidth(0.5).strokeColor(RULE).stroke()
    }
  }

  // Tabellenkopf
  doc.rect(M, y - 6, tableW, 20).fill(LIGHT)
  doc.font(font('semi')).fontSize(8.5).fillColor(GREEN)
  doc.text(t('Pos.', 'No.'), cols.pos + 6, y)
  doc.text(t('Leistung', 'Description'), cols.desc, y)
  doc.text(t('Menge', 'Qty'), cols.qty, y, { width: 46, align: 'right' })
  doc.text(t('Einzelpreis', 'Unit price'), cols.price, y, { width: 72, align: 'right' })
  doc.text(t('Gesamt', 'Total'), cols.total, y, { width: 76, align: 'right' })
  y += 18
  doc.moveTo(M, y - 4).lineTo(W - M, y - 4).lineWidth(0.7).strokeColor(GREEN).stroke()

  const netto = items.reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.unit_price), 0)
  let pos = 1
  for (const it of items) {
    const lineTotal = Number(it.quantity) * Number(it.unit_price)
    const descH = doc.heightOfString(String(it.description), { width: cols.qty - cols.desc - 12 })
    const rowH = Math.max(descH, 14) + 10
    pageBreakIf(rowH + 30)
    doc.font(font()).fontSize(9.5).fillColor(DARK)
    doc.text(String(pos), cols.pos + 6, y + 2)
    doc.text(String(it.description), cols.desc, y + 2, { width: cols.qty - cols.desc - 12 })
    doc.text(String(Number(it.quantity)), cols.qty, y + 2, { width: 46, align: 'right' })
    doc.text(fmtAmount(Number(it.unit_price), lang), cols.price, y + 2, { width: 72, align: 'right' })
    doc.font(font('bold')).text(fmtAmount(lineTotal, lang), cols.total, y + 2, { width: 76, align: 'right' })
    doc.font(font())
    y += rowH
    doc.moveTo(M, y - 6).lineTo(W - M, y - 6).lineWidth(0.4).strokeColor(RULE).stroke()
    pos++
  }

  // ---------- Summen ----------
  const vat = offer.vat_free ? 0 : Math.round(netto * (Number(offer.vat_rate) || 20) / 100 * 100) / 100
  const brutto = Math.round((netto + vat) * 100) / 100
  const sumW = 220, sumX = W - M - sumW
  pageBreakIf(110)
  y += 14
  const sumLines: Array<[string, string, boolean]> = [
    [t('Netto', 'Net'), fmtAmount(netto, lang), false],
    offer.vat_free
      ? [t('Umsatzsteuer', 'VAT'), t('steuerfrei', 'tax exempt'), false]
      : [`${t('USt.', 'VAT')} ${Number(offer.vat_rate) || 20} %`, fmtAmount(vat, lang), false],
    [t('Gesamtbetrag', 'Total amount'), fmtAmount(brutto, lang), true]
  ]
  let sy = y
  for (const [label, value, bold] of sumLines) {
    if (bold) doc.rect(sumX, sy - 5, sumW, 20).fill(LIGHT)
    doc.font(font(bold ? 'bold' : 'reg')).fontSize(bold ? 10.5 : 9.5).fillColor(bold ? GREEN : DARK)
    doc.text(label, sumX + 8, sy, { width: sumW - 100 })
    doc.text(value, sumX + sumW - 92, sy, { width: 84, align: 'right' })
    sy += bold ? 22 : 16
  }
  if (offer.vat_free && offer.vat_note) {
    doc.font(font()).fontSize(8).fillColor(GRAY)
    doc.text(String(offer.vat_note), sumX, sy + 3, { width: sumW, align: 'right' })
    sy += 16
  }

  // ---------- Fussnoten ----------
  y = sy + 26
  if (y > H - 170) { doc.addPage(); y = 60 }
  const defaultNote = t(
    'Dieses Angebot ist freibleibend. Die genannten Preise verstehen sich inklusive Lieferung und Abholung im Raum Wien. Zahlbar innerhalb von 14 Tagen ohne Abzug. Bankverbindung: Raiffeisenbank Mödling, IBAN AT62 3225 0000 0165 1082, BIC RLNWATWWGTD.',
    'This offer is non-binding. Prices include delivery and collection in the Vienna area. Payment due within 14 days without deduction. Bank details: Raiffeisenbank Moedling, IBAN AT62 3225 0000 0165 1082, BIC RLNWATWWGTD.'
  )
  const note = offer.note || defaultNote
  y = richText(y, note, CW) + 16
  doc.font(font()).fontSize(8.5).fillColor(GRAY)
  doc.text(t('Mit freundlichen Grüßen', 'Kind regards'), M, y)
  doc.font(font('med')).fontSize(9.5).fillColor(DARK)
  doc.text('Marvin Eder', M, y + 14)
  doc.font(font('semi')).fontSize(10).fillColor(GREEN)
  doc.text('WOHNFEE', M, y + 28)

  footer()
  doc.end()
  await done
  return Buffer.concat(chunks)
}
