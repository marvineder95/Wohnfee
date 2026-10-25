// Zusatzfelder des Kontaktformulars („Ich bin …", „Wie haben Sie uns gefunden?").
// Eine Liste für Formular, Server (Prüfung + Mail) und Dashboard (Anzeige).

export interface InquiryOption { value: string; label: string; labelEn: string }

export const CUSTOMER_TYPES: InquiryOption[] = [
  { value: 'makler', label: 'Makler/in', labelEn: 'Estate agent' },
  { value: 'bautraeger', label: 'Bauträger', labelEn: 'Property developer' },
  { value: 'privat', label: 'Privat', labelEn: 'Private' },
  { value: 'firma', label: 'Unternehmen', labelEn: 'Company' }
]

export const REFERRAL_SOURCES: InquiryOption[] = [
  { value: 'google', label: 'Google-Suche', labelEn: 'Google search' },
  { value: 'empfehlung', label: 'Empfehlung', labelEn: 'Recommendation' },
  { value: 'instagram', label: 'Instagram', labelEn: 'Instagram' },
  { value: 'facebook', label: 'Facebook', labelEn: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn', labelEn: 'LinkedIn' },
  { value: 'inserat', label: 'Immobilien-Inserat', labelEn: 'Property listing' },
  { value: 'presse', label: 'Presse', labelEn: 'Press' },
  { value: 'bestandskunde', label: 'Schon Kunde', labelEn: 'Existing customer' },
  { value: 'sonstiges', label: 'Sonstiges', labelEn: 'Other' }
]

export const optionLabel = (list: InquiryOption[], value?: string | null) =>
  list.find(o => o.value === value)?.label || ''
