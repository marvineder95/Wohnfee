<script setup lang="ts">
// „So funktioniert WOHNFEE Furniture Leasing" – Ablauf-Sektion der FL-Seiten:
// 6 nummerierte Schritt-Karten mit Foto, darunter 5 Feature-Karten mit Icons.
// Vollständig SSR-gerendert (SEO), keine Interaktion nötig.
const props = withDefaults(defineProps<{ lang?: 'de' | 'en' }>(), { lang: 'de' })

const ICONS: Record<string, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  armchair: '<path d="M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M6 18v2.5M18 18v2.5"/>',
  gem: '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  truck: '<path d="M10 17h4V5H6v12h2"/><path d="M14 8h4l3.5 4v5H18"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5z"/><path d="m14.5 5.5 4 4"/>'
}

const base = '/files/wohnfee/bilder/furniture-leasing/fl-steps'

const content = computed(() => props.lang === 'en' ? {
  kicker: 'IT’S THAT SIMPLE',
  title: 'How WOHNFEE Furniture Leasing works',
  subtitle: 'We make furnished living simple: you choose your furniture – we deliver, assemble and pick everything up again at the end of the rental period. Flexible, reliable and in the highest quality.',
  steps: [
    { img: `${base}/step-1.jpg`, title: 'Choose your furniture', text: 'Discover our high-quality rental furniture and put together your individual furnishing concept.' },
    { img: `${base}/step-2.jpg`, title: 'Choose rental period', text: 'Rent flexibly – from 1 month to several years. The longer the rental period, the better the conditions.' },
    { img: `${base}/step-3.jpg`, title: 'Receive your offer', text: 'On request we create a tailored offer including a furnishing plan – non-binding and fast.' },
    { img: `${base}/step-4.jpg`, title: 'Delivery & assembly', text: 'With our own transport fleet we deliver and assemble at your preferred date – professional and reliable, from start to finish.' },
    { img: `${base}/step-5.jpg`, title: 'Enjoy & feel at home', text: 'Look forward to stylish, fully equipped rooms – without buying and without long-term commitment.' },
    { img: `${base}/step-6.jpg`, title: 'Pick-up at the end', text: 'When the rental period ends, simply extend it or arrange a pick-up appointment – fast, uncomplicated and reliably.' }
  ],
  features: [
    { icon: 'clock', title: 'Flexible rental period', text: 'From 1 month to several years – more attractive conditions for longer rentals.' },
    { icon: 'armchair', title: 'For every room', text: 'Living room, dining room, bedroom, home office, kitchen and much more.' },
    { icon: 'gem', title: 'High quality', text: 'Stylish furniture, selected brands and durable materials.' },
    { icon: 'truck', title: 'All from one hand', text: 'Delivery, assembly, pick-up and transport insurance included.' },
    { icon: 'pencil', title: 'Individual solutions', text: 'Furnishing plan and personal consultation on request.' }
  ]
} : {
  kicker: 'SO EINFACH GEHT’S',
  title: 'So funktioniert WOHNFEE Furniture Leasing',
  subtitle: 'Wir machen möbliertes Wohnen einfach: Sie wählen Ihre Möbel – wir liefern, montieren und holen alles am Ende der Mietdauer wieder ab. Flexibel, zuverlässig und in höchster Qualität.',
  steps: [
    { img: `${base}/step-1.jpg`, title: 'Möbel auswählen', text: 'Entdecken Sie unsere hochwertigen Leihmöbel und stellen Sie Ihr individuelles Einrichtungskonzept zusammen.' },
    { img: `${base}/step-2.jpg`, title: 'Mietdauer wählen', text: 'Mieten Sie flexibel – von 1 Monat bis zu mehreren Jahren. Je länger die Mietdauer, desto günstiger die Konditionen.' },
    { img: `${base}/step-3.jpg`, title: 'Angebot erhalten', text: 'Auf Wunsch erstellen wir Ihnen ein maßgeschneidertes Angebot inklusive Einrichtungsplan – unverbindlich und schnell.' },
    { img: `${base}/step-4.jpg`, title: 'Lieferung & Montage', text: 'Mit unserer eigenen Spedition liefern und montieren wir zum Wunschtermin – professionell und zuverlässig, von Anfang bis Ende.' },
    { img: `${base}/step-5.jpg`, title: 'Wohlfühlen & genießen', text: 'Freuen Sie sich auf stilvolle, voll ausgestattete Räume – ganz ohne Kauf und ohne langfristige Bindung.' },
    { img: `${base}/step-6.jpg`, title: 'Abholung am Ende', text: 'Nach Ablauf der Mietdauer verlängern Sie einfach bequem oder vereinbaren einen Termin für die Abholung – schnell, unkompliziert und zuverlässig.' }
  ],
  features: [
    { icon: 'clock', title: 'Flexible Mietdauer', text: 'Von 1 Monat bis zu mehreren Jahren – bei längerer Miete attraktivere Konditionen.' },
    { icon: 'armchair', title: 'Für jeden Raum', text: 'Wohnzimmer, Esszimmer, Schlafzimmer, Arbeitszimmer, Küche u. v. m.' },
    { icon: 'gem', title: 'Hochwertige Qualität', text: 'Stilvolle Möbel, ausgewählte Marken und langlebige Materialien.' },
    { icon: 'truck', title: 'Alles aus einer Hand', text: 'Lieferung, Montage, Abholung und Transportversicherung inklusive.' },
    { icon: 'pencil', title: 'Individuelle Lösungen', text: 'Auf Wunsch Einrichtungsplan und persönliche Beratung.' }
  ]
})
</script>

<template>
  <section class="hiw" aria-labelledby="hiw-title">
    <header class="hiw__head">
      <h2 id="hiw-title" class="hiw__title">{{ content.title }}</h2>
      <p class="hiw__subtitle">{{ content.subtitle }}</p>
    </header>

    <!-- Schritte -->
    <ol class="hiw__steps">
      <li v-for="(s, i) in content.steps" :key="s.title" class="hiw__step">
        <figure class="hiw__media">
          <NuxtImg :src="s.img" :alt="s.title" :loading="i < 2 ? 'eager' : 'lazy'"
                   sizes="xs:90vw sm:46vw md:30vw lg:200px xl:220px" />
          <span class="hiw__nr" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        </figure>
        <h3 class="hiw__step-title">{{ s.title }}</h3>
        <p class="hiw__step-text">{{ s.text }}</p>
      </li>
    </ol>

    <!-- Features -->
    <ul class="hiw__features">
      <li v-for="f in content.features" :key="f.title" class="hiw__feature">
        <span class="hiw__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[f.icon]" />
        </span>
        <h3 class="hiw__feature-title">{{ f.title }}</h3>
        <p class="hiw__feature-text">{{ f.text }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hiw {
  margin: clamp(3rem, 7vw, 5rem) auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
  max-width: 1400px;
  box-sizing: border-box;
}

/* Kopf */
.hiw__head { text-align: center; margin-bottom: clamp(1.8rem, 4vw, 2.6rem); background: none; }
.hiw__title {
  margin: 0 0 .8rem;
  font-size: clamp(1.5rem, 3.4vw, 2.3rem);
  line-height: 1.15; font-weight: 600; color: #1f1c17;
}
.hiw__subtitle {
  margin: 0 auto; max-width: 680px;
  font-size: .98rem; line-height: 1.65; color: #6f6a5e;
}

/* Schritte */
.hiw__steps {
  list-style: none; margin: 0 0 clamp(2.4rem, 5vw, 3.4rem); padding: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: clamp(1rem, 2vw, 1.6rem);
}
.hiw__step { margin: 0; position: relative; }
.hiw__step:not(:last-child)::after {
  content: ""; position: absolute; top: 18%;
  right: calc(clamp(1rem, 2vw, 1.6rem) / -2 - 5px);
  width: 8px; height: 8px;
  border-top: 2px solid #b9b2a2; border-right: 2px solid #b9b2a2;
  transform: rotate(45deg);
}
.hiw__media {
  margin: 0 0 .9rem; position: relative;
  border-radius: 10px; overflow: hidden;
}
.hiw__media img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.hiw__nr {
  position: absolute; top: 8px; left: 8px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, .92);
  border-radius: 20px;
  font-size: .72rem; font-weight: 700; letter-spacing: .08em;
  color: #26492f;
}
.hiw__step-title { margin: 0 0 .35rem; font-size: 1.02rem; font-weight: 600; color: #1f1c17; }
.hiw__step-text { margin: 0; font-size: .88rem; line-height: 1.6; color: #6f6a5e; }

/* Features – helles Vollbreit-Band mit Trennlinien */
.hiw__features {
  list-style: none;
  margin: 0 calc(50% - 50vw);
  padding: clamp(2rem, 4vw, 3rem) clamp(1.25rem, 5vw, 4.5rem);
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 0;
  background: #f4f7f1;
  box-sizing: border-box;
  width: 100vw;
}
.hiw__feature {
  margin: 0; text-align: left;
  padding: .2rem clamp(1.1rem, 2.6vw, 2.2rem);
}
.hiw__feature:first-child { padding-left: .2rem; }
.hiw__feature:not(:first-child) { border-left: 1px solid #e2e8dd; }
.hiw__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; margin-bottom: .85rem;
  border-radius: 50%;
  background: #fff; border: 1px solid #e6ece1;
  box-shadow: 0 2px 8px rgba(38, 73, 47, .08);
  color: #26492f;
}
.hiw__feature-title { margin: 0 0 .35rem; font-size: .98rem; font-weight: 600; color: #1f1c17; }
.hiw__feature-text { margin: 0; font-size: .86rem; line-height: 1.6; color: #6f6a5e; }

@media (max-width: 1199px) {
  .hiw__steps { grid-template-columns: repeat(3, 1fr); }
  .hiw__step:nth-child(3)::after { display: none; }
  .hiw__features { grid-template-columns: repeat(3, 1fr); row-gap: 2rem; }
  .hiw__feature:nth-child(4) { border-left: 0; padding-left: .2rem; }
}
@media (max-width: 767px) {
  .hiw__steps { grid-template-columns: repeat(2, 1fr); }
  .hiw__step::after { display: none !important; }
  .hiw__features { grid-template-columns: 1fr 1fr; padding-left: 1.5rem; padding-right: 1.5rem; }
  .hiw__feature { padding: .2rem 1rem; }
  .hiw__feature:nth-child(odd) { border-left: 0; padding-left: .2rem; }
}
@media (max-width: 479px) {
  .hiw__steps { grid-template-columns: 1fr; }
  .hiw__media img { aspect-ratio: 16 / 9; }
  .hiw__features { grid-template-columns: 1fr; row-gap: 1.6rem; }
  .hiw__feature { border-left: 0 !important; padding-left: .2rem; text-align: center; }
  .hiw__icon { margin-left: auto; margin-right: auto; }
}
</style>
