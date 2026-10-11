#!/usr/bin/env bash
# Tägliches Backup: Datenbank + hochgeladene Bilder. Behält 14 Tage.
# Cron (als wohnfee):  15 3 * * * /opt/wohnfee/deploy/backup.sh >> /opt/wohnfee/deploy/backups/backup.log 2>&1
# Optional zweiter Ort: BACKUP_REMOTE in .env setzen (rsync-Ziel, z. B. u123@u123.your-storagebox.de:wohnfee)
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
DIR=backups; STAMP=$(date +%F_%H%M)
mkdir -p "$DIR"

docker compose exec -T db sh -c 'exec mysqldump --single-transaction --routines --no-tablespaces -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$DIR/db-$STAMP.sql.gz"
gzip -t "$DIR/db-$STAMP.sql.gz"   # Archiv lesbar?
[ "$(zcat "$DIR/db-$STAMP.sql.gz" | grep -c 'CREATE TABLE')" -gt 5 ] || { echo "Backup unvollständig!"; exit 1; }

docker run --rm -v wohnfee_uploads:/u:ro -v "$PWD/$DIR":/b alpine tar czf "/b/uploads-$STAMP.tar.gz" -C /u .

find "$DIR" -name 'db-*.sql.gz' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +14 -delete

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rsync -a --delete "$DIR/" "$BACKUP_REMOTE/"
fi
echo "$(date '+%F %T') Backup ok: db-$STAMP.sql.gz, uploads-$STAMP.tar.gz"
