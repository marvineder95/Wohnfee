<script setup lang="ts">
// Info-Sektionen unter dem Furniture-Leasing-Shop – Inhalte (SEO-Texte) aus
// den bisherigen Seitenelementen (pages.json ids 331/332 bzw. 562/563),
// Layout nach Vorlage: Overline + große Serif-Überschrift, Foto, Vorteile
// bzw. Ablauf-Schritte mit Icons.
const props = withDefaults(defineProps<{ lang?: 'de' | 'en' }>(), { lang: 'de' })
const isEn = computed(() => props.lang === 'en')

const t = computed(() => isEn.value ? {
  overline1: 'Furniture Leasing',
  h2a: 'Furniture rental for expats',
  lead: 'In operation since 2012, WOHNFEE Furniture Leasing is the first furniture-leasing service in Austria. We provide an exclusive service for those who plan to change their home for a short or mid-term period of time – within Austria and for expatriates.',
  p2: 'Our clients include Austrians, expatriates, numerous embassies, international companies and relocation services.',
  p3: 'We are happy to support your customers or employees on the shortest way to their new home for a fixed term!',
  features: [
    { title: 'Live flexibly', text: 'High-quality furniture for a limited time – exactly when you need it.', icon: 'home' },
    { title: 'Fast & uncomplicated', text: 'Delivery, assembly and pick-up from a single source.', icon: 'truck' },
    { title: 'Sustainable solution', text: 'High-quality furniture in circulation – for more sustainability.', icon: 'leaf' }
  ],
  img1Alt: 'Dining and living area furnished with WOHNFEE rental furniture',
  overline2: 'Our offer',
  h2b: 'Individual furnishing solutions',
  offer1: 'Our company offers attractive rental furniture packages and individual solutions. At the best conditions.',
  offer2: 'We furnish the entire living area according to the customer’s wishes – with furniture, accessories, kitchen utensils, electrical appliances, bed linen and much more. This makes us a smart alternative to the cost- and time-intensive purchase of the interior. A WOHNFEE staff member takes care of the entire processing of the order, from the first to the last day, from assembly to disassembly and final cleaning.',
  steps: [
    { title: 'Planning', text: 'We advise you and create an individual furnishing concept.', icon: 'plan' },
    { title: 'Delivery & assembly', text: 'Punctual delivery and professional assembly on site.', icon: 'truck' },
    { title: 'Usage', text: 'Enjoy high-quality furniture for the desired rental period.', icon: 'bag' },
    { title: 'Pick-up & final cleaning', text: 'After expiry we pick everything up again – quickly and uncomplicated.', icon: 'refresh' }
  ],
  img2Alt: 'Cozy living room furnished with WOHNFEE rental furniture'
} : {
  overline1: 'Furniture Leasing',
  h2a: 'Leihmöbel für Expats',
  lead: 'Mit WOHN.FEE Furniture Leasing bieten wir seit Anfang 2012 als erstes Unternehmen in Österreich ein exquisites Service für all jene, die planen, ihren Wohnort kurzfristig und für eine begrenzte Zeit zu verändern – innerhalb Österreichs und für Expatriats.',
  p2: 'Zu unseren Kunden zählen heute zahlreiche Botschaften, Relocation-Unternehmen und große Unternehmen, die ihren Mitarbeitern den Einstieg erleichtern möchten.',
  p3: 'Wir unterstützen Ihre Kunden oder Mitarbeiter gerne auf dem kürzesten Weg zu ihrem neuen Zuhause auf Zeit!',
  features: [
    { title: 'Flexibel wohnen', text: 'Hochwertige Möbel für begrenzte Zeit – genau dann, wenn Sie sie brauchen.', icon: 'home' },
    { title: 'Schnell & unkompliziert', text: 'Lieferung, Montage und Abholung aus einer Hand.', icon: 'truck' },
    { title: 'Nachhaltige Lösung', text: 'Hochwertige Möbel im Kreislauf – für mehr Nachhaltigkeit.', icon: 'leaf' }
  ],
  img1Alt: 'Ess- und Wohnbereich eingerichtet mit Leihmöbeln von WOHNFEE',
  overline2: 'Unser Angebot',
  h2b: 'Individuelle Einrichtungslösungen',
  offer1: 'Unser Angebot umfasst sowohl attraktive Leihmöbel-Pakete als auch individuelle Lösungen. Zu besten Konditionen.',
  offer2: 'Wir gestalten den kompletten Wohnbereich nach den Wünschen des Kunden – mit Möbeln, Accessoires, Küchenutensilien, Elektrogeräten, Bettwäsche u.v.a.m. Damit bieten wir eine intelligente Alternative zum kosten- und zeitintensiven Kauf des Interieurs. Ein Mitarbeiter bzw. eine Mitarbeiterin von WOHN.FEE Furniture Leasing betreut die komplette Abwicklung des Auftrags, vom ersten bis zum letzten Tag, von der Montage bis zur Demontage und Endreinigung.',
  steps: [
    { title: 'Planung', text: 'Wir beraten Sie und erstellen ein individuelles Einrichtungskonzept.', icon: 'plan' },
    { title: 'Lieferung & Montage', text: 'Pünktliche Lieferung und professionelle Montage vor Ort.', icon: 'truck' },
    { title: 'Nutzung', text: 'Genießen Sie hochwertige Möbel für die gewünschte Mietdauer.', icon: 'bag' },
    { title: 'Abholung & Endreinigung', text: 'Nach Ablauf holen wir alles wieder ab – schnell und unkompliziert.', icon: 'refresh' }
  ],
  img2Alt: 'Gemütliches Wohnzimmer eingerichtet mit Leihmöbeln von WOHNFEE'
})
</script>

<template>
  <div class="fli">
    <!-- ── Sektion 1: Leihmöbel für Expats (Text links, Foto rechts) ── -->
    <section class="fli__sec fli__sec--a">
      <div class="fli__text">
        <p class="fli__overline">{{ t.overline1 }}</p>
        <h2 class="fli__h2">{{ t.h2a }}</h2>
        <p class="fli__lead">{{ t.lead }}</p>
        <p class="fli__p">{{ t.p2 }}</p>
        <p class="fli__p">{{ t.p3 }}</p>
        <ul class="fli__features">
          <li v-for="f in t.features" :key="f.title" class="fli__feature">
            <span class="fli__chip" aria-hidden="true">
              <svg v-if="f.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" />
              </svg>
              <svg v-else-if="f.icon === 'truck'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1.5 5.5h12v11h-12z" /><path d="M13.5 9.5h4l3 3.2v3.8h-7" /><circle cx="6" cy="18.7" r="1.8" /><circle cx="17" cy="18.7" r="1.8" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 21c.5-3 1.5-5.5 3-7.5" /><path d="M9.5 4.5C12 3 15.5 3.5 18 6c3 3 3 8-1 10.5-4 2.5-9.5 1-11.5-2.5" /><path d="M3 21h6" />
              </svg>
            </span>
            <strong class="fli__ftitle">{{ f.title }}</strong>
            <span class="fli__ftext">{{ f.text }}</span>
          </li>
        </ul>
      </div>
      <figure class="fli__media">
        <img src="/files/wohnfee/bilder/furniture-leasing/Furniture_Leasing_1_Essen.jpg"
             :alt="t.img1Alt" loading="lazy">
      </figure>
    </section>

    <!-- ── Sektion 2: Individuelle Einrichtungslösungen (Foto links, Text rechts) ── -->
    <section class="fli__sec fli__sec--b">
      <figure class="fli__media">
        <img src="/files/wohnfee/bilder/furniture-leasing/2024-05-07_L154-FL_0011.jpg"
             :alt="t.img2Alt" loading="lazy">
      </figure>
      <div class="fli__text">
        <p class="fli__overline">{{ t.overline2 }}</p>
        <h2 class="fli__h2">{{ t.h2b }}</h2>
        <p class="fli__lead">{{ t.offer1 }}</p>
        <p class="fli__p">{{ t.offer2 }}</p>
        <ul class="fli__steps">
          <li v-for="s in t.steps" :key="s.title" class="fli__step">
            <span class="fli__chip" aria-hidden="true">
              <svg v-if="s.icon === 'plan'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4.5" y="4" width="15" height="17" rx="2" /><path d="M9 4.5V2.8h6v1.7" /><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4.5" />
              </svg>
              <svg v-else-if="s.icon === 'truck'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1.5 5.5h12v11h-12z" /><path d="M13.5 9.5h4l3 3.2v3.8h-7" /><circle cx="6" cy="18.7" r="1.8" /><circle cx="17" cy="18.7" r="1.8" />
              </svg>
              <svg v-else-if="s.icon === 'bag'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5.5 8h13l-1 12.5h-11z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3" /><path d="M20 3.5V8h-4.5M4 20.5V16h4.5" />
              </svg>
            </span>
            <strong class="fli__ftitle">{{ s.title }}</strong>
            <span class="fli__ftext">{{ s.text }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style>
.fli {
  max-width: 1240px;
  margin: 0 auto;
  padding: 3.5em 1.5em 1em;
}

/* Sektionen: 2-Spalten-Raster, Sektion 2 gespiegelt */
.fli__sec {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 3em 3.5em;
  align-items: center;
  margin-bottom: 4em;
}
.fli__sec--b { grid-template-columns: .95fr 1.05fr; }

/* Overline: klein, großbuchstabig, mit kurzem Strich danach (wie Vorlage) */
.fli__overline {
  display: flex;
  align-items: center;
  gap: .9em;
  margin: 0 0 1em;
  font-size: .78em;
  font-weight: 600;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: #2f5d40;
}
.fli__overline::after {
  content: "";
  display: block;
  width: 3em;
  height: 2px;
  background: #759364;
}

.fli__h2 {
  margin: 0 0 .8em;
  font-family: var(--font-family-02, Georgia, 'Times New Roman', serif);
  font-size: 2.1em;
  font-weight: 500;
  line-height: 1.2;
  color: #2b2b27;
  text-align: left;
  text-transform: none;
}

.fli__lead {
  margin: 0 0 1em;
  font-size: 1.02em;
  line-height: 1.7;
  color: #4c4c46;
}
.fli__p {
  margin: 0 0 .8em;
  font-size: .92em;
  line-height: 1.65;
  color: #6a6a62;
}

/* Fotos: groß, runde Ecken, gleiche Höhe wie Textspalte */
.fli__media {
  margin: 0;
  height: 100%;
  min-height: 24em;
  border-radius: 16px;
  overflow: hidden;
}
.fli__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Feature-/Schritt-Karten */
.fli__features, .fli__steps {
  list-style: none;
  margin: 1.8em 0 0;
  padding: 0;
  display: grid;
  gap: 1.6em;
}
.fli__features { grid-template-columns: repeat(3, 1fr); }
.fli__steps { grid-template-columns: repeat(4, 1fr); }

.fli__feature, .fli__step { display: block; }
.fli__chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.9em;
  height: 2.9em;
  margin-bottom: .8em;
  border-radius: 50%;
  background: #e9efe2;
  color: #2f5d40;
}
.fli__chip svg { width: 1.45em; height: 1.45em; }
.fli__ftitle {
  display: block;
  margin-bottom: .3em;
  font-size: .98em;
  color: #2b2b27;
}
.fli__ftext {
  display: block;
  font-size: .84em;
  line-height: 1.55;
  color: #7a7a72;
}

/* Responsive */
@media (max-width: 1024px) {
  .fli__sec, .fli__sec--b { grid-template-columns: 1fr 1fr; gap: 2em; }
  .fli__steps { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 820px) {
  .fli { padding-top: 2.5em; }
  .fli__sec, .fli__sec--b {
    grid-template-columns: 1fr;
    margin-bottom: 3em;
  }
  /* Foto immer über dem Text */
  .fli__sec--a .fli__media { order: -1; }
  .fli__media { min-height: 16em; }
  .fli__features { grid-template-columns: 1fr; gap: 1.2em; }
  .fli__h2 { font-size: 1.7em; }
}
@media (max-width: 480px) {
  .fli__steps { grid-template-columns: 1fr; }
}
</style>
