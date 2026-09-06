#!/usr/bin/env bash
# One-time Azure VM bootstrap: Docker Engine + swap + self-signed SSL + ufw.
# Uploaded and executed on the instance by deploy-azure.sh (runs with sudo).
# Same role as infra/scripts/bootstrap.sh on Alibaba, with two tweaks:
#   - PUBLIC_IP is passed in by the deploy script (no Alibaba metadata endpoint)
#   - 2 GB swapfile so docker builds never OOM on the 4 GiB B2ats_v2
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

# Let the deploy user run docker without sudo/password.
usermod -aG docker azureuser || true

if [ ! -f /swapfile ]; then
  echo "[bootstrap] adding 2 GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

mkdir -p /opt/app/ssl

if [[ ! -f /opt/app/ssl/server.crt ]]; then
  echo "[bootstrap] generating self-signed certificate..."
  SAN="DNS:localhost,IP:127.0.0.1"
  if [[ -n "${PUBLIC_IP:-}" ]]; then
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
# SSH_ALLOWED_CIDRS is passed by deploy-azure.sh as a space-separated env var.
for cidr in ${SSH_ALLOWED_CIDRS:-0.0.0.0/0}; do
  ufw allow from "${cidr}" to any port 22 proto tcp
done
ufw --force enable

echo "[bootstrap] done."
