<script setup lang="ts">
// Partner-Seite (/partner.html, /en/partners.html) – Einträge aus dem Dashboard (/admin/partner).
// Ohne sichtbare Partner liefert [...slug].vue einen 404, die Seite existiert dann nicht.
import type { PublicPartner } from '~/composables/usePartners'
const props = defineProps<{ page: any; partners: PublicPartner[] }>()
const { t, isEn, lp } = useLang()
const hostOf = (u: string | null) => { try { return u ? new URL(u).host.replace(/^www\./, '') : '' } catch { return '' } }
const desc = (p: PublicPartner) => (isEn.value ? p.descriptionEn || p.description : p.description) || ''
</script>

<template>
  <div class="hsp">
    <section class="hsp__hero">
      <div class="hsp__wrap">
        <p class="hsp__eyebrow">{{ t('Über uns', 'About us') }}</p>
        <h1 class="hsp__h1">{{ t('Unsere Partner', 'Our partners') }}</h1>
        <p class="hsp__lead">{{ t('Gute Räume entstehen im Zusammenspiel. Mit diesen Unternehmen arbeiten wir bei Home Staging, Furniture Leasing und Redesign eng zusammen.', 'Great spaces are a team effort. These are the companies we work closely with on home staging, furniture leasing and redesign.') }}</p>
      </div>
    </section>

    <section class="hsp__list">
      <ul class="hsp__wrap hsp__grid">
        <li v-for="p in props.partners" :key="p.id" class="hsp__card">
          <div class="hsp__logo">
            <img v-if="p.logo" :src="p.logo" :alt="`Logo ${p.name}`" loading="lazy">
            <span v-else class="hsp__initial" aria-hidden="true">{{ p.name.slice(0, 1) }}</span>
          </div>
          <div class="hsp__body">
            <small v-if="p.category">{{ p.category }}</small>
            <h2>{{ p.name }}</h2>
            <p v-if="desc(p)">{{ desc(p) }}</p>
            <a v-if="p.website" :href="p.website" target="_blank" rel="noopener" class="hsp__web">
              {{ hostOf(p.website) }}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
          </div>
        </li>
      </ul>
    </section>

    <section class="hsp__cta">
      <div class="hsp__wrap hsp__ctain">
        <div>
          <h2>{{ t('Partner werden?', 'Become a partner?') }}</h2>
          <p>{{ t('Sie sind Makler, Bauträger, Fotograf oder Handwerksbetrieb und möchten mit uns zusammenarbeiten? Wir freuen uns auf Ihre Nachricht.', 'Are you an estate agent, developer, photographer or craftsperson and want to work with us? We look forward to hearing from you.') }}</p>
        </div>
        <NuxtLink :to="lp('/kontakt.html')" class="hsp__btn">{{ t('Kontakt aufnehmen', 'Get in touch') }}</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hsp {
  --green: #2f5d40; --green-dark: #26492f; --ink: #2b2b28; --muted: #5f5b52; --line: #e6e0d2; --cream: #f8f5ef;
  --serif: var(--font-family-02, Gelasio, Georgia, serif);
  background: var(--cream); color: var(--ink);
}
.hsp__wrap { max-width: 1240px; margin: 0 auto; padding: 0 1.5em; box-sizing: border-box; }
.hsp h1, .hsp h2 { font-family: var(--serif); font-weight: 500; color: var(--ink); border: 0; padding: 0; text-align: left; text-transform: none; }
.hsp__hero { padding: 4.5em 0 2.5em; }
.hsp__eyebrow { display: flex; align-items: center; gap: 1em; margin: 0 0 1.2em; font-size: .72em; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; }
.hsp__eyebrow::after { content: ""; width: 3.5em; height: 1px; background: var(--green); }
.hsp__h1 { font-size: clamp(2.4em, 5vw, 3.6em) !important; line-height: 1.08; margin: 0 0 .45em; }
.hsp__lead { font-size: 1.05em; line-height: 1.7; color: var(--muted); margin: 0; max-width: 40em; }

.hsp__list { padding: 1em 0 4.5em; }
.hsp__grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 1.2em; margin: 0 auto; }
.hsp__card { display: flex; gap: 1.3em; align-items: flex-start; padding: 1.5em; background: #fff; border: 1px solid var(--line); border-radius: 22px; transition: transform .25s, box-shadow .25s; }
.hsp__card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(60, 50, 30, .1); }
.hsp__logo { flex: none; width: 6.2em; height: 6.2em; border-radius: 16px; background: var(--cream); display: grid; place-items: center; overflow: hidden; }
.hsp__logo img { max-width: 82%; max-height: 82%; object-fit: contain; }
.hsp__initial { font-family: var(--serif); font-size: 2.2em; color: var(--green); }
.hsp__body { min-width: 0; display: grid; gap: .35em; }
.hsp__body small { font-size: .7em; letter-spacing: .16em; text-transform: uppercase; color: var(--green); font-weight: 700; }
.hsp__body h2 { font-size: 1.3em !important; margin: 0; overflow-wrap: anywhere; }
.hsp__body p { margin: 0; color: var(--muted); line-height: 1.6; font-size: .95em; }
.hsp__web { display: inline-flex; align-items: center; gap: .3em; margin-top: .3em; color: var(--green); font-weight: 600; font-size: .9em; text-decoration: none; overflow-wrap: anywhere; }
.hsp__web:hover { text-decoration: underline; }
.hsp__web svg { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }

.hsp__cta { background: var(--green); color: #fff; padding: 3.2em 0; }
.hsp__ctain { display: flex; align-items: center; justify-content: space-between; gap: 1.5em 3em; flex-wrap: wrap; }
.hsp__cta h2 { color: #fff; font-size: 1.8em !important; margin: 0 0 .3em; }
.hsp__cta p { margin: 0; color: rgba(255, 255, 255, .85); max-width: 42em; line-height: 1.6; }
.hsp__btn { display: inline-flex; padding: .85em 1.9em; border-radius: 999px; background: #fff; color: var(--green); font-weight: 600; font-size: .9em; text-decoration: none; transition: background .15s; }
.hsp__btn:hover { background: var(--cream); color: var(--green-dark); }
@media (max-width: 560px) { .hsp__card { flex-direction: column; } .hsp__hero { padding-top: 3em; } }
</style>
