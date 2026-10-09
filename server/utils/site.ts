// Basis-URL für Links in E-Mails (Einladung, Passwort-Reset).
// In Produktion NUXT_SITE_URL setzen (z. B. https://www.wohnfee.at): der Host-Header
// einer Anfrage ist vom Absender frei wählbar und darf Reset-Links nicht bestimmen.
export function publicOrigin(event: any): string {
  const configured = String(useRuntimeConfig().siteUrl || '').trim().replace(/\/+$/, '')
  return configured || getRequestURL(event).origin
}

/** Heutiges Datum in Österreich als 'YYYY-MM-DD' (Server läuft ggf. in UTC) */
export function todayVienna(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
