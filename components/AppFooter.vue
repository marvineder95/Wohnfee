<script setup lang="ts">
const { routes } = useSiteData()
const route = useRoute()
const { open } = useCookiebar()
const openSettings = () => open('settings')

const isEn = computed(() => route.path.startsWith('/en/'))

const t = computed(() => {
  const de = {
    services: 'Services', company: 'Unternehmen', legal: 'Rechtliches',
    contact: 'Kontakt', newsletter: 'Newsletter',
    tagline: 'Hochwertige Möbel & Accessories zur Miete – für Home Staging, temporäre Wohnlösungen und mehr.',
    address: ['Eder & Steiner GmbH', 'Obersdorferstraße 8', '2201 Seyring'],
    phone: '+43 676 9202236', email: 'office@wohnfee.at',
    message: 'Nachricht senden',
    nlText: 'Bleib auf dem Laufenden und erhalte Neuigkeiten, Inspirationen und exklusive Angebote.',
    nlPlaceholder: 'E-Mail-Adresse',
    nlConsent: 'Ich stimme zu, dass ich regelmäßig Neuigkeiten per E-Mail erhalte.',
    nlThanks: 'Danke für deine Anmeldung!',
    nlError: 'Bitte E-Mail-Adresse angeben und dem Erhalt zustimmen.',
    rights: 'Alle Rechte vorbehalten.',
    socials: { instagram: 'WOHNFEE auf Instagram', linkedin: 'WOHNFEE auf LinkedIn', pinterest: 'WOHNFEE auf Pinterest', facebook: 'WOHNFEE auf Facebook' }
  }
  const en = {
    services: 'Services', company: 'Company', legal: 'Legal',
    contact: 'Contact', newsletter: 'Newsletter',
    tagline: 'High-quality furniture & accessories for rent – for home staging, temporary living solutions and more.',
    address: ['Eder & Steiner GmbH', 'Obersdorferstraße 8', '2201 Seyring'],
    phone: '+43 676 9202236', email: 'office@wohnfee.at',
    message: 'Send message',
    nlText: 'Stay up to date and receive news, inspiration and exclusive offers.',
    nlPlaceholder: 'E-mail address',
    nlConsent: 'I agree to receive news by e-mail on a regular basis.',
    nlThanks: 'Thanks for signing up!',
    nlError: 'Please enter your e-mail address and agree to receive the newsletter.',
    rights: 'All rights reserved.',
    socials: { instagram: 'WOHNFEE on Instagram', linkedin: 'WOHNFEE on LinkedIn', pinterest: 'WOHNFEE on Pinterest', facebook: 'WOHNFEE on Facebook' }
  }
  return isEn.value ? en : de
})

// Interne Ziel-URL im EN-Modus aufs EN-Gegenstück umschreiben (falls vorhanden)
const linkFor = (r?: string) => {
  if (!r) return r
  if (!isEn.value) return r
  const key = r.endsWith('.html') ? r : r + '.html'
  return (routes as Record<string, any>)['/en' + key] ? '/en' + key : r
}

// Spalten-Inhalte: label → DE-Route. Einträge ohne Route werden als
// reiner Text gerendert (keine toten Links – wäre schlecht fürs Ranking),
// sobald die Seite existiert, reicht der Routen-Eintrag hier.
const columns = computed(() => ([
  {
    title: t.value.services,
    items: [
      { label: 'Home Staging', route: '/home-staging.html' },
      { label: 'Furniture Leasing', route: '/furniture-leasing.html' },
      { label: 'Redesign', route: '/redesign.html' },
      { label: isEn.value ? 'Consulting' : 'Beratung', route: '' },
      { label: isEn.value ? 'Projects' : 'Projekte', route: '/projekte.html' },
      { label: isEn.value ? 'Offers' : 'Angebote', route: '' }
    ]
  },
  {
    title: t.value.company,
    items: [
      { label: isEn.value ? 'About Us' : 'Über uns', route: '/team.html' },
      { label: 'Blog', route: '/aktuelles.html' },
      { label: isEn.value ? 'Careers' : 'Karriere', route: '' },
      { label: isEn.value ? 'Contact' : 'Kontakt', route: '/kontakt.html' }
    ]
  },
  {
    title: t.value.legal,
    items: [
      { label: isEn.value ? 'Legal Notice' : 'Impressum', route: '/impressum.html' },
      { label: isEn.value ? 'Privacy Policy' : 'Datenschutzerklärung', route: '/datenschutz.html' },
      { label: isEn.value ? 'Cookie Settings' : 'Cookie-Einstellungen', action: 'cookies' as const },
      { label: 'AGB', route: '' },
      { label: isEn.value ? 'Right of Withdrawal' : 'Widerrufsbelehrung', route: '' }
    ]
  }
]))

const socials = [
  { key: 'instagram', url: 'https://www.instagram.com/wohnfee.at/' },
  { key: 'linkedin', url: 'https://www.linkedin.com/company/wohnfee' },
  { key: 'pinterest', url: 'https://www.pinterest.at/wohnfee/' },
  { key: 'facebook', url: 'https://www.facebook.com/wohnfee.homestaging' }
] as const

// ---------- Newsletter ----------
const nlEmail = ref('')
const nlConsent = ref(false)
const nlState = ref<'idle' | 'sending' | 'error' | 'done'>('idle')
const nlSubmit = async () => {
  if (!nlEmail.value || !nlConsent.value) { nlState.value = 'error'; return }
  nlState.value = 'sending'
  try {
    await $fetch('/api/newsletter', {
      method: 'POST',
      body: { email: nlEmail.value, consent: nlConsent.value, lang: isEn.value ? 'en' : 'de' }
    })
    nlState.value = 'done'
  } catch {
    nlState.value = 'error'
  }
}
const year = new Date().getFullYear()
</script>

<template>
  <footer id="footer">
    <div class="inside">
      <div class="wffoot">
        <!-- Marke -->
        <div class="wffoot__brand">
          <NuxtLink :to="linkFor('/start.html')" class="wffoot__logo">
            <img src="/files/wohnfee/layout/img/wohnfee_logo_neu.png" alt="WOHNFEE Home Staging">
          </NuxtLink>
          <p class="wffoot__tagline">{{ t.tagline }}</p>
          <div class="wffoot__socials">
            <a v-for="s in socials" :key="s.key" :href="s.url" target="_blank" rel="noopener"
               class="wffoot__social" :aria-label="(t.socials as any)[s.key]">
              <svg v-if="s.key === 'instagram'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
              </svg>
              <svg v-else-if="s.key === 'linkedin'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3.5" y="3.5" width="4.4" height="10" rx="0.8" />
                <circle cx="5.7" cy="17.6" r="2.2" />
                <path d="M11 8.2h4.1v1.9c.7-1.2 2-2.2 3.7-2.2 2.9 0 4.2 1.9 4.2 5v6.6h-4.3v-5.9c0-1.6-.6-2.6-2-2.6-1.4 0-2.3 1-2.3 2.7v5.8H11z" />
              </svg>
              <svg v-else-if="s.key === 'pinterest'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.8a9.2 9.2 0 0 0-3.4 17.7c-.1-.7-.2-1.9 0-2.7l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.5 1.9 1.9 0 3.3-2 3.3-4.8 0-2.5-1.8-4.3-4.4-4.3a4.6 4.6 0 0 0-4.8 4.6c0 .9.4 1.9.8 2.4l-.3 1.2c-.1.4-.3.5-.7.3-1.2-.6-2-2.4-2-3.9 0-3.2 2.3-6.1 6.7-6.1 3.5 0 6.3 2.5 6.3 5.9 0 3.5-2.2 6.3-5.3 6.3-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 2-1.3 2.6A9.2 9.2 0 1 0 12 2.8z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13.4 21v-7.8h2.6l.4-3h-3V8.3c0-.9.3-1.5 1.6-1.5h1.5V4.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.6v3h2.7V21z" />
              </svg>
            </a>
          </div>
        </div>

        <!-- Link-Spalten -->
        <nav v-for="col in columns" :key="col.title" class="wffoot__col" :aria-label="col.title">
          <h3>{{ col.title }}</h3>
          <ul>
            <li v-for="item in col.items" :key="item.label">
              <button v-if="'action' in item && item.action === 'cookies'" type="button" class="wffoot__link wffoot__link--btn" @click="openSettings">{{ item.label }}</button>
              <NuxtLink v-else-if="item.route" :to="linkFor(item.route)" class="wffoot__link">{{ item.label }}</NuxtLink>
              <span v-else class="wffoot__link wffoot__link--dead">{{ item.label }}</span>
            </li>
          </ul>
        </nav>

        <!-- Kontakt -->
        <div class="wffoot__col wffoot__contact">
          <h3>{{ t.contact }}</h3>
          <ul class="wffoot__contactlist">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" />
              </svg>
              <span>{{ t.address.join('\n').replace(/\n/g, ' ') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              </svg>
              <a :href="'tel:+436769202236'">{{ t.phone }}</a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
              </svg>
              <a :href="'mailto:' + t.email">{{ t.email }}</a>
            </li>
          </ul>
          <NuxtLink :to="linkFor('/kontakt.html')" class="wffoot__cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 2 11 13" /><path d="M22 2 15 21l-4-8-8-4z" />
            </svg>
            <span>{{ t.message }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
          </NuxtLink>
        </div>

        <!-- Newsletter -->
        <div class="wffoot__col wffoot__news">
          <h3>{{ t.newsletter }}</h3>
          <p class="wffoot__newstext">{{ t.nlText }}</p>
          <form v-if="nlState !== 'done'" class="wffoot__nlform" @submit.prevent="nlSubmit" novalidate>
            <input v-model="nlEmail" type="email" :placeholder="t.nlPlaceholder" :aria-label="t.nlPlaceholder" required>
            <button type="submit" :aria-label="t.newsletter" :disabled="nlState === 'sending'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </form>
          <p v-if="nlState === 'error'" class="wffoot__nlerror">{{ t.nlError }}</p>
          <p v-if="nlState === 'done'" class="wffoot__nlthanks">{{ t.nlThanks }}</p>
          <label v-if="nlState !== 'done'" class="wffoot__nlconsent">
            <input v-model="nlConsent" type="checkbox">
            <span>{{ t.nlConsent }}</span>
          </label>
        </div>
      </div>

      <!-- Untere Leiste -->
      <div class="wffoot__bar">
        <p class="wffoot__copy">© {{ year }} WOHNFEE – Eder &amp; Steiner GmbH<br>{{ t.rights }}</p>
        <nav class="wffoot__barlinks" :aria-label="t.legal">
          <NuxtLink :to="linkFor('/impressum.html')">{{ isEn ? 'Legal Notice' : 'Impressum' }}</NuxtLink>
          <NuxtLink :to="linkFor('/datenschutz.html')">{{ isEn ? 'Privacy Policy' : 'Datenschutzerklärung' }}</NuxtLink>
          <button type="button" @click="openSettings">{{ isEn ? 'Cookie Settings' : 'Cookie-Einstellungen' }}</button>
          <span class="dead">AGB</span>
          <span class="dead">{{ isEn ? 'Right of Withdrawal' : 'Widerrufsbelehrung' }}</span>
        </nav>
        <div class="wffoot__pay" aria-hidden="true">
          <span class="pay pay--visa">VISA</span>
          <span class="pay pay--mc"><i></i><i></i></span>
          <span class="pay pay--amex">AMEX</span>
          <span class="pay pay--bill">{{ isEn ? 'Invoice' : 'Rechnung' }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style>
/* Neuer Footer nach Vorlage: cremefarbener Grund, Marke links, drei
   Link-Spalten, Kontakt mit Icons + CTA, Newsletter-Formular, darunter
   eine Leiste mit Copyright, Rechtslinks und Zahlungsarten. */
#footer {
  background: #f7f5ef;
  color: #55554e;
  font-size: .95rem;
  margin-top: 3em;
}

#footer .inside {
  /* global ist footer .inside eine Flexbox mit flex-basis:22.5% auf ALLEN
     Kindern (alte 4-Spalten-Verteilung) – für das Grid unten brauchen wir Block */
  display: block;
}

/* Legacy-Reset aus style.css neutralisieren: dort bekommt footer .inside *
   flex-basis:22.5% + justify-content:space-between (alte 4-Spalten-Flexbox;
   spezifischer als unsere Klassenregeln, daher hier mit ID aufheben).
   .wffoot__bar ist ausgenommen – die untere Leiste soll space-between
   behalten (bekommt sie durch den Legacy-Rule sogar ohne eigene Angabe). */
#footer .inside *:not(.wffoot__bar) {
  flex-basis: auto;
  justify-content: flex-start;
}

.wffoot {
  display: grid;
  grid-template-columns: 1.7fr .75fr .8fr 1fr 1.2fr 1.3fr;
  gap: 2.5em 2em;
  padding: 3em 0 2em;
  align-items: start;
}

/* Marke */
.wffoot__brand { max-width: 20em; }
.wffoot__logo img { width: 200px; height: auto; display: block; }
.wffoot__tagline {
  margin: 1em 0 1.2em;
  font-size: .92em;
  line-height: 1.55;
  color: #7a7a72;
}
.wffoot__socials { display: flex; justify-content: flex-start; gap: .55em; }
.wffoot__social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1em;
  height: 2.1em;
  border-radius: .45em;
  background: #2f5d40;
  color: #fff;
  transition: background .15s ease;
}
.wffoot__social:hover { background: #759364; }
.wffoot__social svg { width: 1.15em; height: 1.15em; }

/* Spalten */
.wffoot__col h3 {
  margin: 0 0 .9em;
  font-size: 1.02em;
  font-weight: 700;
  color: #2f5d40;
  text-align: left;
  font-family: var(--font-family-01, inherit);
}
/* wichtig: global ist nav ul eine horizontale Flexbox mit 1.2em-Einträgen
   (navigation.css) – die Spalten brauchen eine vertikale Listenform */
.wffoot__col ul { display: block; list-style: none; margin: 0; padding: 0; }
.wffoot__col li { margin: 0 0 .55em; font-size: inherit; }
.wffoot__link {
  color: #6b6b63;
  text-decoration: none;
  font-size: .92em;
  transition: color .15s ease;
}
a.wffoot__link:hover { color: #2f5d40; }
.wffoot__link--btn {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.wffoot__link--btn:hover { color: #2f5d40; }
.wffoot__link--dead { color: #9a9a92; cursor: default; }

/* Kontakt */
.wffoot__contactlist { list-style: none; margin: 0 0 1.1em; padding: 0; }
.wffoot__contactlist li {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: .6em;
  margin-bottom: .6em;
  font-size: inherit;
}
.wffoot__contactlist svg {
  width: 1.25em;
  height: 1.25em;
  flex-shrink: 0;
  margin-top: .12em;
  color: #2f5d40;
}
.wffoot__contactlist a { color: #55554e; text-decoration: none; white-space: nowrap; }
.wffoot__contactlist a:hover { color: #2f5d40; }

.wffoot__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5em;
  padding: .5em 1.1em;
  border: 1.5px solid #2f5d40;
  border-radius: 999px;
  color: #2f5d40;
  text-decoration: none;
  font-weight: 600;
  font-size: .92em;
  transition: background .15s ease, color .15s ease;
}
.wffoot__cta:hover { background: #2f5d40; color: #fff; }
.wffoot__cta svg { width: 1.05em; height: 1.05em; }

/* Newsletter */
.wffoot__newstext { margin: 0 0 .8em; font-size: .92em; line-height: 1.5; color: #7a7a72; }
.wffoot__nlform {
  display: flex;
  justify-content: flex-start;
  border: 1px solid #ddd6c6;
  border-radius: .45em;
  overflow: hidden;
  background: #fff;
}
.wffoot__nlform input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: .6em .8em;
  font: inherit;
  font-size: .9em;
  color: #333;
  background: transparent;
  outline: none;
}
.wffoot__nlform button {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.9em;
  border: 0;
  background: #2f5d40;
  color: #fff;
  cursor: pointer;
  transition: background .15s ease;
}
.wffoot__nlform button:hover { background: #759364; }
.wffoot__nlform button svg { width: 1.2em; height: 1.2em; }
.wffoot__nlconsent {
  display: flex;
  gap: .5em;
  align-items: flex-start;
  margin-top: .7em;
  font-size: .78em;
  line-height: 1.4;
  color: #8a8a82;
  cursor: pointer;
}
.wffoot__nlconsent input { margin-top: .15em; accent-color: #2f5d40; }
.wffoot__nlerror { margin: .5em 0 0; font-size: .82em; color: #a33; }
.wffoot__nlthanks { margin: .5em 0 0; font-size: .92em; color: #2f5d40; font-weight: 600; }

/* Untere Leiste */
.wffoot__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1em 2em;
  padding: 1.2em 0 1.4em;
  border-top: 1px solid #e5e0d2;
  font-size: .82em;
  color: #8a8a82;
}
.wffoot__copy { margin: 0; line-height: 1.5; }
.wffoot__barlinks { display: flex; justify-content: flex-start; flex-wrap: wrap; gap: .4em 1.2em; }
.wffoot__barlinks a,
.wffoot__barlinks button {
  color: #8a8a82;
  text-decoration: none;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.wffoot__barlinks a:hover, .wffoot__barlinks button:hover { color: #2f5d40; }
.wffoot__barlinks .dead { color: #b0b0a8; }

/* Zahlungsarten-Badges */
.wffoot__pay { display: flex; gap: .4em; align-items: center; }
.pay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.55em;
  padding: 0 .5em;
  border-radius: .25em;
  background: #fff;
  border: 1px solid #ddd6c6;
  font-size: .68em;
  font-weight: 800;
  font-style: italic;
  letter-spacing: .02em;
  color: #1a1f71;
}
.pay--mc { gap: 0; width: 2.6em; padding: 0; border: 1px solid #ddd6c6; position: relative; }
.pay--mc i {
  width: .95em;
  height: .95em;
  border-radius: 50%;
  display: block;
}
.pay--mc i:first-child { background: #eb001b; margin-right: -.45em; }
.pay--mc i:last-child { background: #f79e1b; opacity: .9; }
.pay--amex { background: #2e77bc; color: #fff; font-style: normal; }
.pay--bill { color: #55554e; font-weight: 600; font-style: normal; }

/* Responsive */
@media (max-width: 1100px) {
  .wffoot { grid-template-columns: 1.2fr 1fr 1fr; }
  .wffoot__brand { grid-column: 1 / -1; max-width: none; }
  .wffoot__news { grid-column: 2 / -1; }
}
@media (max-width: 767px) {
  #footer .inside {
    background-size: 16em, 12em;
    background-position: right -5em bottom -5em, left -4em top -6em;
  }
  .wffoot { grid-template-columns: 1fr 1fr; gap: 2em 1.5em; padding: 2.2em 0 1.5em; }
  .wffoot__news { grid-column: 1 / -1; }
  .wffoot__bar { justify-content: flex-start; }
}
@media (max-width: 480px) {
  .wffoot { grid-template-columns: 1fr; }
  .wffoot__news { grid-column: auto; }
}
</style>
