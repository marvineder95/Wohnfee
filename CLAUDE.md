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
- Blog-Artikel aus dem Dashboard: Tabelle `blog_posts`, nur Sektion `trends-tipps`, nur DE.
  Öffentlich via `/api/blog`; Trends & Tipps, Aktuell und Sitemap werden daher live gerendert.

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
- Rolle „Benutzer" hat derzeit dieselben Rechte wie „Admin" (nur Benutzerverwaltung ist
  Superadmin-only) – Rechtekonzept festlegen?
- Newsletter: kein Abmeldelink/Double-Opt-in (Abmeldung nur per Antwort-Mail).
- Checkout: Mietdauer im Formular (1/3 Monate) ist unabhängig von der Mietdauer je Artikel
  im Warenkorb – vereinheitlichen?
- Noch nicht im neuen Design: Datenschutz, Furniture Leasing unterhalb des Heros, EN-Startseite
  hat englische Daten nur teilweise (Zielgruppen-Elemente ungenutzt).
