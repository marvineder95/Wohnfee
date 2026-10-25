// Gesichts-Ausschnitt für runde Team-Avatare (Kontaktseite, Team-Seite).
// Die Team-Fotos sind Ganzkörperbilder; im quadratischen Ausschnitt (oben bündig) wird
// per Zoom auf das Gesicht gezoomt. focus = Gesichtsposition im Quadrat, zoom = Vergrößerung.
const FACES: Record<string, { focus: string; zoom: number }> = {
  'Marvin_Eder_Portrait.jpg': { focus: '50% 30%', zoom: 1.5 }, // Marvin (Porträt, Übergang bis Ganzkörperfoto)
  'WohnFee_Brandingfotos_23-6.jpg': { focus: '55% 50%', zoom: 2.6 } // Sandra Berte (sitzend)
}

/** CSS-Variablen --focus/--zoom für ein Team-Foto (Standard: Gesicht oben mittig) */
export function teamFaceStyle(src: string | null | undefined): Record<string, string> {
  const file = String(src || '').split('/').pop() || ''
  const f = FACES[file] || { focus: '50% 14%', zoom: 2.3 }
  return { '--focus': f.focus, '--zoom': String(f.zoom) }
}
