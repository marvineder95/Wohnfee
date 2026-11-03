// Gesichts-Ausschnitt für runde Team-Avatare (Kontaktseite, Team-Seite).
// Die Team-Fotos sind Ganzkörperbilder; im quadratischen Ausschnitt (oben bündig) wird
// per Zoom auf das Gesicht gezoomt. focus = Gesichtsposition im Quadrat, zoom = Vergrößerung.
const FACES: Record<string, { focus: string; zoom: number }> = {
  // Marvin – Platzhalter mit Initialen („Bin gerade beim Fotografen …“), DE und EN
  'Marvin_Eder_Platzhalter.jpg': { focus: '50% 49%', zoom: 1.9 },
  'Marvin_Eder_Platzhalter_en.jpg': { focus: '50% 49%', zoom: 1.9 },
  'WohnFee_Brandingfotos_23-6.jpg': { focus: '55% 50%', zoom: 2.6 } // Sandra Berte (sitzend)
}

/** CSS-Variablen --focus/--zoom für ein Team-Foto (Standard: Gesicht oben mittig) */
export function teamFaceStyle(src: string | null | undefined): Record<string, string> {
  const file = String(src || '').split('/').pop() || ''
  const f = FACES[file] || { focus: '50% 14%', zoom: 2.3 }
  return { '--focus': f.focus, '--zoom': String(f.zoom) }
}
