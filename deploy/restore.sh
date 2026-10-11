#!/usr/bin/env bash
# Wiederherstellen:  ./restore.sh backups/db-2026-10-11_0315.sql.gz [backups/uploads-2026-10-11_0315.tar.gz]
# ACHTUNG: überschreibt die aktuelle Datenbank (und ggf. die Uploads).
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
DB=${1:?Pfad zur db-*.sql.gz angeben}
read -r -p "Datenbank mit $DB überschreiben? (ja/nein) " ok; [ "$ok" = ja ] || exit 1
gunzip -c "$DB" | docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
if [ -n "${2:-}" ]; then
  docker run --rm -v wohnfee_uploads:/u -v "$PWD/$(dirname "$2")":/b alpine sh -c "tar xzf /b/$(basename "$2") -C /u"
fi
docker compose restart app 2>/dev/null || true
echo "Wiederhergestellt."
