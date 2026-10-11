<script setup lang="ts">
const { routes } = useSiteData()
const route = useRoute()

const isEn = computed(() => route.path.startsWith('/en/'))

const t = computed(() => {
  const de = {
    services: 'Services', company: 'Unternehmen', legal: 'Rechtliches',
    contact: 'Kontakt', newsletter: 'Newsletter',
    tagline: 'Hochwertige Möbel & Accessories zur Miete – für Home Staging, temporäre Wohnlösungen und mehr.',
    address: ['Eder & Steiner GmbH', 'Obersdorferstraße 5', '2201 Seyring'],
    phone: '+43 676 9202236', email: 'office@wohnfee.at',
    message: 'Nachricht senden',
    nlText: 'Bleib auf dem Laufenden und erhalte Neuigkeiten, Inspirationen und exklusive Angebote.',
    nlPlaceholder: 'E-Mail-Adresse',
    nlConsent: 'Ich stimme zu, dass ich regelmäßig Neuigkeiten per E-Mail erhalte.',
    nlThanks: 'Fast geschafft! Bitte bestätige deine Anmeldung über den Link in der E-Mail, die wir dir gerade geschickt haben.',
    nlError: 'Bitte E-Mail-Adresse angeben und dem Erhalt zustimmen.',
    rights: 'Alle Rechte vorbehalten.',
    socials: { instagram: 'WOHNFEE auf Instagram', linkedin: 'WOHNFEE auf LinkedIn', facebook: 'WOHNFEE auf Facebook' }
  }
  const en = {
    services: 'Services', company: 'Company', legal: 'Legal',
    contact: 'Contact', newsletter: 'Newsletter',
    tagline: 'High-quality furniture & accessories for rent – for home staging, temporary living solutions and more.',
    address: ['Eder & Steiner GmbH', 'Obersdorferstraße 5', '2201 Seyring'],
    phone: '+43 676 9202236', email: 'office@wohnfee.at',
    message: 'Send message',
    nlText: 'Stay up to date and receive news, inspiration and exclusive offers.',
    nlPlaceholder: 'E-mail address',
    nlConsent: 'I agree to receive news by e-mail on a regular basis.',
    nlThanks: 'Almost done! Please confirm your subscription via the link in the e-mail we just sent you.',
    nlError: 'Please enter your e-mail address and agree to receive the newsletter.',
    rights: 'All rights reserved.',
    socials: { instagram: 'WOHNFEE on Instagram', linkedin: 'WOHNFEE on LinkedIn', facebook: 'WOHNFEE on Facebook' }
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
      { label: 'AGB', route: '' },
      { label: isEn.value ? 'Right of Withdrawal' : 'Widerrufsbelehrung', route: '' }
    ]
  }
]))

const socials = [
  { key: 'instagram', url: 'https://www.instagram.com/wohnfee.vienna/' },
  { key: 'linkedin', url: 'https://www.linkedin.com/company/wohn-fee-home-staging-redesign-furniture-leasing/' },
  { key: 'facebook', url: 'https://www.facebook.com/wohnfee.homestaging/' }
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
               class="wffoot__social" :class="`wffoot__social--${s.key}`" :aria-label="(t.socials as any)[s.key]">
              <!-- Logos in den Originalfarben der Plattformen -->
              <svg v-if="s.key === 'instagram'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" aria-hidden="true">
                <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.8" />
                <circle cx="12" cy="12" r="3.9" />
                <circle cx="17.1" cy="6.9" r="1.15" fill="#fff" stroke="none" />
              </svg>
              <svg v-else-if="s.key === 'linkedin'" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M6.94 8.98H3.56V20h3.38V8.98ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.68c0-3.02-1.61-4.43-3.77-4.43-1.74 0-2.52.96-2.96 1.63V8.98h-3.37c.04.96 0 11.02 0 11.02h3.37v-6.15c0-.33.02-.66.12-.9.27-.66.87-1.34 1.89-1.34 1.33 0 1.86 1.01 1.86 2.5V20h3.37v-6.32h-.51Z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
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
              <NuxtLink v-if="item.route" :to="linkFor(item.route)" class="wffoot__link">{{ item.label }}</NuxtLink>
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
          <span class="dead">AGB</span>
          <span class="dead">{{ isEn ? 'Right of Withdrawal' : 'Widerrufsbelehrung' }}</span>
        </nav>
        <div class="wffoot__pay" aria-hidden="true">
          <!-- keine Kartenzahlung – abgerechnet wird ausschließlich per Rechnung -->
          <span class="pay pay--bill">{{ isEn ? 'Payment by invoice' : 'Zahlung per Rechnung' }}</span>
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
/* Social-Icons: Logo mittig in der Kachel (sonst greift die Rücksetzung oben) */
#footer .inside .wffoot__social { justify-content: center; }

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
  width: 2.3em;
  height: 2.3em;
  border-radius: .6em;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .1);
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
.wffoot__social:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0, 0, 0, .16); filter: brightness(1.06); }
.wffoot__social svg { width: 1.2em; height: 1.2em; }
/* Originalfarben der Plattformen */
.wffoot__social--instagram {
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%);
}
.wffoot__social--linkedin { background: #0a66c2; }
.wffoot__social--facebook { background: #1877f2; }

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
