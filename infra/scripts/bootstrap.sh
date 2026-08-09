#!/usr/bin/env bash
# One-time server bootstrap: Docker Engine + self-signed SSL + ufw SSH guard.
# Uploaded and executed on the instance by deploy.sh (runs as root).
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "[bootstrap] updating apt..."
apt-get update -y

echo "[bootstrap] installing base packages..."
apt-get install -y ca-certificates curl gnupg ufw rsync openssl

if ! command -v docker >/dev/null 2>&1; then
  echo "[bootstrap] installing Docker Engine + compose plugin..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
else
  echo "[bootstrap] docker already installed, skipping."
fi

mkdir -p /opt/app/ssl

if [[ ! -f /opt/app/ssl/server.crt ]]; then
  echo "[bootstrap] generating self-signed certificate..."
  PUBLIC_IP="$(curl -fsS --max-time 10 http://100.100.100.200/latest/meta-data/eipv4 2>/dev/null \
    || curl -fsS --max-time 10 ifconfig.me \
    || echo '')"

  SAN="DNS:localhost,IP:127.0.0.1"
  if [[ -n "${PUBLIC_IP}" ]]; then
    SAN="${SAN},IP:${PUBLIC_IP}"
  fi

  openssl genrsa -out /opt/app/ssl/server.key 2048
  openssl req -new -x509 \
    -key /opt/app/ssl/server.key \
    -out /opt/app/ssl/server.crt \
    -days 365 \
    -subj "/C=FI/O=SmartHeatingDemo/CN=smartheating-demo" \
    -addext "subjectAltName=${SAN}"
  cat /opt/app/ssl/server.crt /opt/app/ssl/server.key >/opt/app/ssl/server.pem
  chmod 644 /opt/app/ssl/server.crt /opt/app/ssl/server.pem
  chmod 600 /opt/app/ssl/server.key
fi

echo "[bootstrap] configuring ufw (SSH restricted, 80/443 open)..."
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 80/tcp
ufw allow 443/tcp
# SSH_ALLOWED_CIDRS is passed by deploy.sh as a space-separated env var.
for cidr in ${SSH_ALLOWED_CIDRS:-0.0.0.0/0}; do
  ufw allow from "${cidr}" to any port 22 proto tcp
done
ufw --force enable

echo "[bootstrap] done."
