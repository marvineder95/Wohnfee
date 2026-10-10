# WOHNFEE – Website & Dashboard (Nuxt 3)

Marke WOHNFEE (Home Staging, Furniture Leasing, Redesign) der **Eder & Steiner GmbH**,
Obersdorferstraße 5, 2201 Seyring · FN 665860g (LG Korneuburg) · UID ATU82726169.
Kontakt auf der Website: office@wohnfee.at, +43 676 9202236.

## Starten
- `npm run dev` (Port 7100; falls belegt z. B. `npx nuxt dev --port 3000`)
- MySQL lokal: 127.0.0.1:3307, DB `wohnfee` (Docker). Schema/Migrationen laufen beim
  Serverstart automatisch (`server/plugins/db-init.ts`, `server/utils/db-schema.ts`).
- Betrieb nur als Node-Server (`nuxt build`), **nicht** `nuxt generate` – Dashboard,
  Formulare, Shop und Blog-API brauchen den Server.
- `public/uploads/` (Inventar, Avatare, Blog-Bilder) muss beim Deployment erhalten bleiben;
  ausgeliefert über `server/routes/uploads/[...path].get.ts`.

## Inhalte
- Seiteninhalte statisch in `data/pages.json` / `data/pages-en.json` (gleiche Seiten-IDs),
  Artikel in `data/news.json` / `data/news-en.json`, Routing über `data/routes.json`.
- Zentrale Seite: `pages/[...slug].vue` – wählt je Seite das neue Layout über
  `pageRoute` (DE-Route, auch für `/en/…`).
- Beiträge aus dem Dashboard (`/admin/artikel`): Tabelle `blog_posts`, Rubriken aktuelles,
  projekte, trends-tipps, events (`BLOG_SECTIONS` in server/utils/blog.ts, Links
  `/blogartikel-<rubrik>/<slug>.html`), Projekte mit Zielgruppen (`categories`), Galerie (`gallery`),
  Vorher-Foto (`before_image` → Vorher/Nachher-Regler `HsBeforeAfter.vue`, neuester auch auf der Startseite)
  und Bildunterschrift (`photo_facts`). Rücksetzpunkt vor den Echtheits-Anpassungen: Git-Tag `vor-foto-anpassung`.
  Nur DE. Öffentlich via `/api/blog`; Blog-Übersichten, Artikel und Sitemap werden live gerendert.

## Furniture Leasing – Mietregeln
- Zentral in `shared/rental-perks.ts`: Mindestmietwert € 100/Monat (Checkout gesperrt, auch
  serverseitig), Gratis-Transport in Wien ab € 350/Monat (nur Positionen ≥ 3 Monate),
  sonst −50 % auf Liefer-/Abholgebühr. Anzeige: `RentalPerks.vue` in Warenkorb und Checkout;
  der Vorteil landet als Notiz in der Mietanfrage (Dashboard + Mail).
- Warenkorb öffnet seitenweit ohne Weiterleitung (`AppCartDrawer.vue`, Event `wf:open-cart`).

## Dashboard (/admin)
- Navigation gruppiert in `layouts/admin.vue` (`NAV_GROUPS`): Eingang · Planung ·
  Kunden & Finanzen · Website · Verwaltung. Badges für neue Kontakt-/Mietanfragen (60-s-Refresh).
- `?new=1` öffnet auf Projekte/Kalender/Angebote/Rechnungen/Kontakte/Inventar direkt den
  Neu-Dialog (`composables/useNewParam.ts`) – genutzt von den Schnellzugriffen der Übersicht.
- DB-Pool (`server/utils/db.ts`): DATE kommt als 'YYYY-MM-DD', DECIMAL als Zahl.
- Datum „heute": Server `todayVienna()` (`server/utils/site.ts`), Browser `localToday()`.
- Rechnungen: nur Entwürfe lösch-/editierbar; ausgestellte nur Status gesendet↔bezahlt,
  Korrektur über Storno (serverseitig erzwungen).
- Möbel ↔ Projekte: `server/utils/inventory-sync.ts` verhindert Doppelbelegung und setzt
  Lagerstatus (lager/vermietet); Shop zeigt nur freien Bestand.
- Anfrage → Angebot: `server/utils/offer-create.ts` (Miet- und Kontaktanfragen), Angebote
  öffnen per `/admin/angebote?open=ID`. Projekt → „Mietverlängerung" (`extension-offer.post.ts`).
- Transportkosten (`server/utils/transport.ts`, Seite `/admin/konditionen`, Setting
  `transport_settings`): Team × Stundensatz × (2 × Fahrzeit + Zeit vor Ort) für Lieferung UND
  Abholung + Kilometergeld nur für km über der Freigrenze × 4 Strecken; Vorteile (Wien gratis /
  −50 %) als Preisfaktor. Route via OpenStreetMap (Nominatim + OSRM), Cache-Tabelle `geo_cache`.
  Jede Mietanfrage erzeugt automatisch einen Angebotsentwurf (Möbel × Mietdauer + Transport).
- Sanfter Upsell (keine Popups, max. ein Hinweis je Schritt): Warenkorb-Vorschläge zur
  Gratis-Transport-/Mindestwert-Lücke (`CartSuggestions.vue`), „Passt dazu" je Artikel (Tabelle
  `item_matches`, gepflegt im Inventar-Dialog, im Katalog als `matches`), Checkout-Hinweis
  Mietdauer/3-Monats-Tarif, optionales Deko-Paket (Konditionen, `/api/rental-extras`, nie
  vorausgewählt), Home-Staging-Hinweis auf der Bestätigungsseite.
- Reservierung & Online-Annahme (`server/utils/reservations.ts`, Job `reservation-job.ts` alle 15 min):
  Mietanfrage → Möbel 3 Tage reserviert (nicht im Shop, auch nicht manuell zuweisbar); Angebot senden →
  3 Tage gültig ab Versand, Reservierung bis Ende des Gültigkeitstags; nach 48 h Erinnerungsmail.
  Kundenseite `/angebot/<token>` (API `/api/offer/:token`): annehmen → Projekt + Möbel + Liefertermin,
  ablehnen → sofort frei. Status im Angebots-Editor auf angenommen/abgelehnt löst dasselbe aus.
  Mietanfragen: „+3 Tage" / „Freigeben". Möbel kommen erst über Touren → „Abholung erledigt" (auch Spediteur, Name wird im Projekt vermerkt) zurück
  (Shop / Reinigung-Reparatur = Status `pflege` / defekt).
  Annahme → `server/utils/offer-invoices.ts`: Entwurf „Monat 1" (Positionen mit Einheit „Mon."),
  Entwurf „Einmalige Leistungen" (Transport, Deko) und Abo für Monat 2…N (Vorlage = Monat 1).
- Touren & Rückgaben (`/admin/touren`, API `/api/admin/logistics`): Kalendertermine +
  Projekt-Deadlines mit Möbeln + Überfälliges; Packliste `/admin/packliste/:id` (druckbar).
- Abo-Rechnungen: Tabelle `recurring_invoices`, Erzeugung `server/utils/recurring.ts`
  (Plugin stündlich + beim Öffnen der Rechnungen) → immer als Entwurf.
- Mahnwesen: `server/utils/dunning.ts` (Ziel 14 Tage, 3 Stufen, +7 Tage je Stufe).
- Newsletter: Double-Opt-in (Status ausstehend/aktiv/abgemeldet), Seiten unter
  `server/routes/newsletter/*`, persönlicher Abmeldelink + List-Unsubscribe-Header.
- Push (PWA): `server/utils/push.ts` (web-push, VAPID-Schlüssel in `settings`, Tabelle
  `push_subscriptions`), Auslöser bei neuer Kontakt-/Mietanfrage; Aktivieren je Gerät über
  Topbar-Hinweis oder Profil → Benachrichtigungen (`composables/usePush.ts`). Service Worker
  `public/wf-admin-sw.js` (im Dev mit ?dev=1 ohne Caching). iOS: nur als installierte App.
- Achtung: Die Kimi-App startet eine ALTE Projektkopie auf Port 7100 (gleiche DB) – nicht
  mit diesem Projekt verwechseln.
- Rollen & Rechte: `shared/permissions.ts` (eine Tabelle für Server + UI). Admin (superadmin),
  Designerin (designer: alles außer Benutzer; Konditionen nur ansehen), Spediteur (driver: nur
  ansehen, eigene Kalendertermine; keine Angebote/Rechnungen/Konditionen/Newsletter/Blog).
  Server: `server/middleware/admin-permissions.ts`; UI: `usePermissions()`, Menü + Seitenschutz
  im Layout, Bearbeiten-Elemente per `canEdit(area)` bzw. `<fieldset :disabled>`.
- Sicherheit: Login max. 10 Fehlversuche/15 min je IP, „Passwort vergessen" 5/h,
  Mietanfragen 5/h (`server/utils/rate-limit.ts`). Reset-Links nie in API-Antworten.
  In Produktion `NUXT_SITE_URL` setzen (Basis für Links in Mails).

## Design-System (neue Seiten)
- Komponenten `components/Hs*.vue`: Start, Hero/Content (Home Staging), Audience (Bauträger/
  Makler/Privat), Prices, Faq, Redesign, BlogList, Article, Gallery, Team, Press, Contact,
  Legal. Furniture-Leasing-Hero steckt in `RentalShop.vue`.
- Farben/Typo: Grün `#2f5d40`, Creme `#f8f5ef`, Serif `--font-family-02` (Gelasio).
  Muster: Vollbild-Hero (Höhe = Viewport minus Header via `--hs-head`), Eyebrow mit Linie,
  Karten mit 16–26px Radius, grüne CTA-Bänder, Scroll-Reveal (`.rv`).
- Texte möglichst aus den Seitendaten lesen; feste Beschriftungen zweisprachig mit
  `useLang()` → `t('Deutsch', 'English')`, interne Links mit `lp('/seite.html')`.
- Bilder: `HsImg` (nutzt IPX, außer für `/uploads/…`).
- Altes Contao-CSS stylt globale Elemente (h1/h2 zentriert, `header`, `footer`, `ul`, `nav`):
  in Komponenten gezielt überschreiben, keine `<header>`/`<footer>`-Tags in Inhalten verwenden.
- Graue Unterleiste (`AppSubmenu`) ist auf allen neu gestalteten Seiten ausgeblendet.

## Offene Punkte (vom Kunden zu klären)
- Handelsrechtliche Geschäftsführung fürs Impressum (bisher nur gewerberechtl. GF Marvin Eder).
- Gewerbe im Impressum: nur Handel + Kleintransport aufgeführt (IT, Eisenbahn weggelassen)?
- Widersprüche: „80–150 Teile“ vs. alte FAQ „100–200“; Leihdauer „mind. 2 Monate“ vs. „3 Monate“.
- Datenschutzerklärung inhaltlich auf Eder & Steiner GmbH prüfen (nur Adresse ersetzt).
- SMTP-Passwort (`NUXT_SMTP_PASSWORD`) fehlt → Mails werden nur geloggt.
- Mietkatalog: Möbel ohne Fotos; danach Live-Produktvorschau auf der Startseite möglich.
- Tippfehler im Pflegetext: Redesign „entseht“, Preise Paket 1/3 (Komma/€ am Ende).
- Konditionen: Stundensatz (Platzhalter 45 €/Std.), Aufbau-/Abbauzeiten und Kilometergeld
  im Dashboard prüfen. 
- Checkout: Mietdauer im Formular (1/3 Monate) ist unabhängig von der Mietdauer je Artikel
  im Warenkorb – vereinheitlichen?
- Datenschutz (neu, Seite 11 in pages(-en).json, Layout HsLegal): gelb markierte Lücken ausfüllen
  (Hosting-Anbieter + Log-Löschfrist, SMTP-Anbieter, OSRM-Betreiber); Fotonachweis nennt noch iStock.
  Google Analytics nutzt eine alte UA-ID (seit 2023 abgeschaltet) – entfernen oder auf GA4 umstellen.
- Noch nicht im neuen Design: Furniture Leasing unterhalb des Heros, EN-Startseite
  hat englische Daten nur teilweise (Zielgruppen-Elemente ungenutzt).
