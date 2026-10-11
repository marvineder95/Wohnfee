#!/usr/bin/env bash
# Einmalige Grundeinrichtung eines frischen Ubuntu-24.04-Servers für WOHNFEE.
# Als root ausführen:  bash server-setup.sh
# Macht: Updates, Benutzer „wohnfee", Docker, Firewall (22/80/443), Fail2ban,
#        automatische Sicherheitsupdates, Zeitzone. SSH-Passwort-Login wird nur
#        abgeschaltet, wenn für „wohnfee" ein SSH-Schlüssel hinterlegt ist (kein Aussperren).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Bitte als root ausführen."; exit 1; }

echo "== Pakete aktualisieren"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades rsync
timedatectl set-timezone Europe/Vienna || true
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Docker (offizielles Paket-Repository)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "== Benutzer wohnfee"
if ! id wohnfee >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" wohnfee
fi
usermod -aG sudo,docker wohnfee
install -d -m 700 -o wohnfee -g wohnfee /home/wohnfee/.ssh
if [ -s /root/.ssh/authorized_keys ] && [ ! -s /home/wohnfee/.ssh/authorized_keys ]; then
  cp /root/.ssh/authorized_keys /home/wohnfee/.ssh/authorized_keys
fi
[ -f /home/wohnfee/.ssh/authorized_keys ] && chown wohnfee:wohnfee /home/wohnfee/.ssh/authorized_keys && chmod 600 /home/wohnfee/.ssh/authorized_keys
install -d -o wohnfee -g wohnfee /opt/wohnfee

echo "== Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
# Hinweis: Docker veröffentlicht nur die Ports von Caddy (80/443); die DB ist nicht nach außen offen.

echo "== Fail2ban (SSH)"
cat > /etc/fail2ban/jail.d/sshd.local <<'JAIL'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "== SSH absichern"
if [ -s /home/wohnfee/.ssh/authorized_keys ]; then
  cat > /etc/ssh/sshd_config.d/10-wohnfee.conf <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
SSHD
  systemctl reload ssh || systemctl reload sshd
  echo "   Passwort- und root-Login deaktiviert. Ab jetzt:  ssh wohnfee@<server>"
else
  echo "   ⚠ Kein SSH-Schlüssel für wohnfee gefunden – Passwort-Login bleibt AN."
  echo "     Schlüssel hinterlegen (siehe Anleitung) und dieses Skript erneut ausführen."
fi

echo
echo "Fertig. Weiter mit Schritt 3 der Anleitung (deploy/README.md)."
