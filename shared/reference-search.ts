// „Im Netz suchen“ für Objekte ohne geprüften Referenz-Link: öffnet eine Bildersuche mit Hersteller + Name,
// damit das Team das Modell wiedererkennt. Es wird nichts kopiert oder gespeichert.
const NOISE = /\b(privat|willhaben|leihgabe|zuerst|jetzt|besitz|via|über|ueber|gebraucht|dk|pl|now)\b/gi

export function referenceSearchUrl(title: string, supplier?: string | null): string {
  const sup = String(supplier || '').split(/[/+(]/)[0].replace(NOISE, '').trim()
  const name = String(title || '').replace(/["„“”]/g, ' ').replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim()
  const q = [sup && !name.toLowerCase().includes(sup.toLowerCase()) ? sup : '', name].filter(Boolean).join(' ')
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`
}
