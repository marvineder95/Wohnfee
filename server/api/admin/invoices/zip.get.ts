import { zipSync, strToU8 } from 'fflate'
import { requireAdmin } from '../../../utils/admin-auth'
import { query } from '../../../utils/db'
import { buildInvoicePdf } from '../../../utils/invoice-pdf'
import { daysOverdue } from '../../../utils/dunning'

// GET /api/admin/invoices/zip?from=YYYY-MM-DD&to=YYYY-MM-DD&filter=alle|offen|ueberfaellig|entwurf
// Alle Rechnungen (Rechnungsdatum) im Zeitraum als ZIP: je Rechnung ein PDF + Uebersicht.csv (für die Buchhaltung).
const ISO = /^\d{4}-\d{2}-\d{2}$/
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const from = String(q.from || '')
  const to = String(q.to || '')
  if ((from && !ISO.test(from)) || (to && !ISO.test(to))) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Datum' })
  }
  const filter = String(q.filter || 'alle')

  let invoices: any[] = await query(
    `SELECT * FROM invoices
     WHERE (:from = '' OR doc_date >= :from) AND (:to = '' OR doc_date <= :to)
     ORDER BY doc_date, number`,
    { from, to }
  )
  // gleiche Regeln wie die Reiter in der Liste
  if (filter === 'offen') invoices = invoices.filter(i => i.status === 'gesendet' && !i.storno_of)
  else if (filter === 'ueberfaellig') invoices = invoices.filter(i => i.status === 'gesendet' && !i.storno_of && (daysOverdue(i) ?? 0) > 0)
  else if (filter === 'entwurf') invoices = invoices.filter(i => i.status === 'entwurf')
  if (!invoices.length) throw createError({ statusCode: 404, statusMessage: 'Keine Rechnungen im gewählten Zeitraum.' })
  if (invoices.length > 500) throw createError({ statusCode: 400, statusMessage: 'Zu viele Rechnungen (max. 500) – bitte Zeitraum verkleinern.' })

  const logoPng = (await useStorage('assets:server').getItemRaw('wohnfee-logo.png')) as Buffer | null
  const byId = new Map(invoices.map(i => [i.id, i]))
  const files: Record<string, Uint8Array> = {}
  const csv = ['Rechnungsnummer;Rechnungsdatum;Kunde;Netto;USt %;USt;Brutto;Status;Storno von']
  const money = (v: number) => v.toFixed(2).replace('.', ',')
  const dmy = (d: any) => String(d || '').slice(0, 10).split('-').reverse().join('.')
  const STATUS: Record<string, string> = { entwurf: 'Entwurf', gesendet: 'Gesendet', bezahlt: 'Bezahlt', storniert: 'Storniert' }

  for (const inv of invoices) {
    const items: any[] = await query(
      'SELECT position, description, quantity, unit, unit_price FROM invoice_items WHERE invoice_id = :id ORDER BY position',
      { id: inv.id }
    )
    let stornoInfo = null
    if (inv.storno_of) {
      const orig = byId.get(inv.storno_of)
      stornoInfo = orig ? { number: orig.number, doc_date: orig.doc_date }
        : ((await query('SELECT number, doc_date FROM invoices WHERE id = :id', { id: inv.storno_of }))[0] as any) || null
    }
    const pdf = await buildInvoicePdf(inv, items, logoPng, stornoInfo)
    const name = `${String(inv.number).replace(/[\\/:*?"<>|]/g, '-')}.pdf`
    files[name] = new Uint8Array(pdf)

    const netto = Math.round(items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0) * 100) / 100
    const rate = inv.vat_free ? 0 : (Number(inv.vat_rate) || 20)
    const vat = Math.round(netto * rate) / 100
    const cust = String(inv.customer_name || '').replace(/[;\r\n]+/g, ' ').trim()
    csv.push([inv.number, dmy(inv.doc_date), cust, money(netto), String(rate), money(vat), money(netto + vat),
      STATUS[inv.status] || inv.status, stornoInfo?.number || ''].join(';'))
  }
  // BOM, damit Excel die Umlaute richtig anzeigt
  files['Uebersicht.csv'] = strToU8('﻿' + csv.join('\r\n') + '\r\n')

  const zip = zipSync(files, { level: 6 })
  const label = from || to ? `${from || 'Anfang'}_bis_${to || 'heute'}` : 'alle'
  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="Rechnungen_${label}.zip"`)
  return Buffer.from(zip)
})
