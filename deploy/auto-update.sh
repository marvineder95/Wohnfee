#!/usr/bin/env bash
# Automatisches Update vom GitHub-Zweig „live" (Cron alle 5 Minuten):
#   */5 * * * * /opt/wohnfee/deploy/auto-update.sh >> /opt/wohnfee/deploy/logs/update.log 2>&1
# Ablauf: neuer Commit auf origin/live? → Backup → neuen Stand bauen (alte Seite läuft weiter)
#         → austauschen → Health-Check. Schlägt Bau oder Start fehl, wird der vorherige Stand
#         wiederhergestellt. Ergebnis als Push-Meldung ans Team (Dashboard-PWA).
# Manuell sofort auslösen:  /opt/wohnfee/deploy/auto-update.sh --force
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD
BRANCH=${DEPLOY_BRANCH:-live}
mkdir -p deploy/logs
exec 9>deploy/logs/.update.lock
flock -n 9 || exit 0   # läuft schon

log() { echo "$(date '+%F %T') $*"; }
notify() {  # $1 Titel, $2 Text – über die laufende App (nur aus dem Container erreichbar)
  docker compose -f "$REPO/deploy/docker-compose.yml" exec -T app node -e '
    fetch("http://127.0.0.1:3000/api/internal/deploy-notify", { method: "POST",
      headers: { "content-type": "application/json", "x-deploy-token": process.env.NUXT_ADMIN_SECRET || "" },
      body: JSON.stringify({ title: process.argv[1], body: process.argv[2] }) }).catch(() => {})' "$1" "$2" >/dev/null 2>&1 || true
}
health() {  # wartet bis zu 3 Minuten auf „healthy"
  for _ in $(seq 1 36); do
    s=$(docker inspect -f '{{.State.Health.Status}}' wohnfee-app-1 2>/dev/null || echo none)
    [ "$s" = healthy ] && return 0
    sleep 5
  done
  return 1
}

git fetch -q origin "$BRANCH" || { log "git fetch fehlgeschlagen"; exit 1; }
NEW=$(git rev-parse "origin/$BRANCH")
OLD=$(git rev-parse HEAD)
if [ "$NEW" = "$OLD" ] && [ "${1:-}" != "--force" ]; then exit 0; fi

MSG=$(git log -1 --format=%s "$NEW")
log "Update ${OLD:0:7} → ${NEW:0:7}: $MSG"
deploy/backup.sh >/dev/null 2>&1 && log "Backup ok" || log "Warnung: Backup fehlgeschlagen"

# -f: lokale Änderungen an versionierten Dateien verwerfen (.env & Uploads sind nicht versioniert)
if ! git checkout -q -f -B "$BRANCH" "$NEW"; then
  log "CHECKOUT FEHLGESCHLAGEN – bleibe auf ${OLD:0:7}"
  notify "Website-Update fehlgeschlagen" "„$MSG\" konnte nicht ausgecheckt werden – die bisherige Version läuft weiter."
  exit 1
fi
cd deploy
if ! docker compose build app >/tmp/wohnfee-build.log 2>&1; then
  log "BUILD FEHLGESCHLAGEN – bleibe auf ${OLD:0:7}"; tail -20 /tmp/wohnfee-build.log
  cd "$REPO" && git checkout -q -B "$BRANCH" "$OLD"
  notify "Website-Update fehlgeschlagen" "Bau von „$MSG\" fehlgeschlagen – die bisherige Version läuft weiter."
  exit 1
fi
docker compose up -d >/dev/null 2>&1
if health; then
  log "OK – ${NEW:0:7} ist online"
  notify "Website aktualisiert ✓" "$MSG"
  docker image prune -f >/dev/null 2>&1
else
  log "START FEHLGESCHLAGEN – Rollback auf ${OLD:0:7}"; docker compose logs --tail 30 app
  cd "$REPO" && git checkout -q -B "$BRANCH" "$OLD" && cd deploy
  docker compose build app >/dev/null 2>&1 && docker compose up -d >/dev/null 2>&1 && health && log "Rollback ok"
  notify "Website-Update zurückgerollt" "„$MSG\" startete nicht sauber – die vorherige Version ist wieder online."
  exit 1
fi
