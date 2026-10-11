# WOHNFEE – Server einrichten (IONOS VPS, Ubuntu 24.04)

Server: **87.106.27.101** · Ablauf: zuerst unter **neu.wohnfee.at** testen, dann auf www umstellen.
Befehle mit `mac$` laufen im Terminal am Mac (im Projektordner), `root#` / `wohnfee$` auf dem Server.

## 1. SSH-Schlüssel hinterlegen (einmalig)
```bash
mac$ ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519 -C "marvin@point4studios"
mac$ ssh-copy-id root@87.106.27.101          # fragt einmal nach dem IONOS-Root-Passwort
mac$ ssh root@87.106.27.101 'echo ok'        # muss OHNE Passwort „ok" ausgeben
```
Danach im IONOS Cloud Panel das Initial-Passwort ändern. In der **IONOS-Firewall** nur 22, 80, 443 (TCP) erlauben.

## 2. Server absichern + Docker
```bash
mac$ scp deploy/server-setup.sh root@87.106.27.101:
mac$ ssh root@87.106.27.101 'bash server-setup.sh'
mac$ ssh wohnfee@87.106.27.101 'docker ps'   # ab jetzt nur noch als „wohnfee" (root-Login ist aus)
```

## 3. DNS (bei Domainfactory)
A-Record **neu.wohnfee.at → 87.106.27.101** anlegen. MX-/Mail-Einträge NICHT ändern.
Prüfen: `mac$ dig +short neu.wohnfee.at` → 87.106.27.101

## 4. Code auf den Server (GitHub, nur lesend)
```bash
wohnfee$ ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "wohnfee-server"
wohnfee$ cat ~/.ssh/github_deploy.pub
```
→ GitHub › Repo **marvineder95/Wohnfee** › Settings › Deploy keys › *Add* (ohne Schreibrecht) – den Schlüssel einfügen.
```bash
wohnfee$ printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n' >> ~/.ssh/config
wohnfee$ git clone -b redesign-website git@github.com:marvineder95/Wohnfee.git /opt/wohnfee
```

## 5. Konfiguration
```bash
wohnfee$ cd /opt/wohnfee/deploy && cp .env.example .env
wohnfee$ for k in NUXT_ADMIN_SECRET NUXT_DB_PASSWORD MYSQL_ROOT_PASSWORD; do sed -i "s|^$k=.*|$k=$(openssl rand -hex 32)|" .env; done
wohnfee$ nano .env        # SMTP-Zugangsdaten des Postfachs eintragen, Domain prüfen
```

## 6. Daten vom Mac übernehmen (Inventar, Kunden, Rechnungen, Bilder …)
```bash
mac$ deploy/export-local.sh
mac$ scp deploy/backups/initial-* wohnfee@87.106.27.101:/opt/wohnfee/deploy/backups/
wohnfee$ cd /opt/wohnfee/deploy && docker compose up -d db && sleep 20
wohnfee$ ./restore.sh backups/initial-db.sql.gz backups/initial-uploads.tar.gz     # mit „ja" bestätigen
```

## 7. Starten
```bash
wohnfee$ docker compose up -d --build      # erster Build dauert ~3–5 Minuten
wohnfee$ docker compose ps                 # app = healthy
wohnfee$ docker compose logs -f app        # Strg+C beendet nur die Anzeige
```
→ https://neu.wohnfee.at (Zertifikat kommt automatisch) und https://neu.wohnfee.at/admin testen.

## 8. Tägliches Backup
```bash
wohnfee$ (crontab -l 2>/dev/null; echo '15 3 * * * /opt/wohnfee/deploy/backup.sh >> /opt/wohnfee/deploy/backups/backup.log 2>&1') | crontab -
wohnfee$ ./backup.sh && ls -lh backups/
```
**Zweiter Ort (empfohlen):** z. B. Hetzner Storage Box oder IONOS-Backup; Ziel als `BACKUP_REMOTE=…` in `.env` eintragen.
Wiederherstellen testen (am besten einmal pro Quartal): `./restore.sh backups/db-….sql.gz backups/uploads-….tar.gz`

## Updates einspielen (automatisch über den Zweig `live`)
Der Server prüft alle 5 Minuten den GitHub-Zweig **live**. Gibt es einen neuen Commit: Backup → neu bauen
(alte Seite läuft weiter) → austauschen → Health-Check; schlägt etwas fehl, bleibt/kommt die vorherige Version.
Ergebnis kommt als Push-Meldung ins Dashboard. Log: `deploy/logs/update.log`.
```bash
mac$ git push origin redesign-website:live              # „jetzt live stellen"
wohnfee$ /opt/wohnfee/deploy/auto-update.sh --force     # sofort statt in ≤5 Min.
```
Einrichtung (einmalig, als wohnfee):
```bash
wohnfee$ (crontab -l; echo '*/5 * * * * /opt/wohnfee/deploy/auto-update.sh >> /opt/wohnfee/deploy/logs/update.log 2>&1') | crontab -
```

## Live gehen (www.wohnfee.at)
1. In `.env`: `SITE_DOMAINS=www.wohnfee.at, wohnfee.at` und `NUXT_SITE_URL=https://www.wohnfee.at`
2. Bei Domainfactory: A-Records **www** und **@** (wohnfee.at) → 87.106.27.101 (Mail/MX unverändert lassen)
3. `docker compose up -d` – Caddy holt die Zertifikate automatisch.
4. Vorher: aktuelle Daten erneut exportieren/importieren (Schritt 6), falls am Mac weitergearbeitet wurde.

## Gut zu wissen
- Datenbank ist nicht von außen erreichbar; nur Caddy (80/443) ist offen.
- Hochgeladene Bilder liegen im Docker-Volume `wohnfee_uploads`, die DB in `wohnfee_dbdata` – beides sichert `backup.sh`.
- Sicherheitsupdates installiert Ubuntu automatisch; Docker-Images aktualisieren: `docker compose pull && docker compose up -d --build`.
