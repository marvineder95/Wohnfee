#!/usr/bin/env bash
# Löscht wöchentlich die Container-Protokolle von WOHNFEE-App und Webserver (Caddy).
# Grund: Datenschutzerklärung – Fehlerprotokolle mit IP-Adressen spätestens nach 14 Tagen weg.
# Cron (Benutzer wohnfee): 50 4 * * 0 /opt/wohnfee/deploy/purge-logs.sh >> /opt/wohnfee/deploy/logs/purge.log 2>&1
set -euo pipefail
for c in wohnfee-app-1 wohnfee-caddy-1; do
  p=$(docker inspect --format '{{.LogPath}}' "$c" 2>/dev/null) || continue
  [ -n "$p" ] || continue
  # Protokolldateien gehören root → kurz per Hilfscontainer leeren
  docker run --rm -v "$(dirname "$p")":/l alpine sh -c "truncate -s 0 /l/$(basename "$p")"
done
echo "$(date '+%F %T') Protokolle geleert"
