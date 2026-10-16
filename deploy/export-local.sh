#!/usr/bin/env bash
# Auf dem Mac ausführen: exportiert die lokale Datenbank + Uploads für den Umzug auf den Server.
# Danach:  scp deploy/backups/initial-* wohnfee@<server>:/opt/wohnfee/deploy/backups/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
docker exec wohnfee-mysql sh -c 'exec mysqldump --single-transaction --routines --no-tablespaces -uwohnfee -pwohnfee-dev wohnfee' 2>/dev/null \
  | gzip > backups/initial-db.sql.gz
# COPYFILE_DISABLE: keine macOS-Hilfsdateien (._*) ins Archiv
COPYFILE_DISABLE=1 tar czf backups/initial-uploads.tar.gz --exclude='._*' --exclude='.DS_Store' -C ../public/uploads .
ls -lh backups/initial-*
