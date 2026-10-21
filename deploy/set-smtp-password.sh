#!/usr/bin/env bash
# SMTP-Passwort für den Mailversand der Website setzen (Eingabe verdeckt) und die App neu starten.
# Aufruf auf dem Server:  bash /opt/wohnfee/deploy/set-smtp-password.sh
set -euo pipefail
cd "$(dirname "$0")"
read -rsp "SMTP-Passwort für $(grep -E '^NUXT_SMTP_USER=' .env | cut -d= -f2-): " PW; echo
[ -n "$PW" ] || { echo "Kein Passwort eingegeben – nichts geändert."; exit 1; }
# Wert für die .env sicher quoten (Compose liest '…' wörtlich)
if [[ "$PW" != *"'"* ]]; then Q="'$PW'"
else E=${PW//\\/\\\\}; E=${E//\"/\\\"}; E=${E//\$/\\\$}; Q="\"$E\""; fi
cp .env .env.bak
SMTPPW="$Q" awk 'BEGIN{v=ENVIRON["SMTPPW"]} /^NUXT_SMTP_PASSWORD=/{print "NUXT_SMTP_PASSWORD=" v; done=1; next} {print} END{if(!done) print "NUXT_SMTP_PASSWORD=" v}' .env.bak > .env
chmod 600 .env .env.bak
docker compose up -d app >/dev/null 2>&1
echo "Gespeichert, App wird neu gestartet. Test: bash /opt/wohnfee/deploy/test-mail.sh"
