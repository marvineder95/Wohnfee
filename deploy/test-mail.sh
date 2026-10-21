#!/usr/bin/env bash
# Prüft die SMTP-Anmeldung und schickt eine Test-Mail an den Absender (oder an $1).
set -euo pipefail
cd "$(dirname "$0")"
docker compose exec -T -e TO="${1:-}" app node --input-type=module -e '
const nm = (await import("/app/.output/server/node_modules/nodemailer/dist/esm/nodemailer.js")).default;
const port = Number(process.env.NUXT_SMTP_PORT || 465);
const t = nm.createTransport({ host: process.env.NUXT_SMTP_HOST, port,
  secure: process.env.NUXT_SMTP_SECURE ? process.env.NUXT_SMTP_SECURE === "true" : port === 465,
  auth: { user: process.env.NUXT_SMTP_USER, pass: process.env.NUXT_SMTP_PASSWORD } });
const from = process.env.NUXT_MAIL_FROM || process.env.NUXT_SMTP_USER;
const to = process.env.TO || process.env.NUXT_SMTP_USER;
t.verify().then(() => { console.log("Anmeldung OK (" + process.env.NUXT_SMTP_HOST + ":" + port + ")");
  return t.sendMail({ from, to, subject: "WOHNFEE Test-Mail", text: "Der Mailversand von neu.wohnfee.at funktioniert." }); })
 .then(r => console.log("Test-Mail gesendet an " + to + " – " + r.response))
 .catch(e => { console.error("FEHLER: " + e.message); process.exit(1); });'
