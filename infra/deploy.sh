#!/usr/bin/env bash
# Deploy / redeploy the Smart Heating demo to the Alibaba Cloud instance.
#
# Usage:
#   cd infra
#   export ALICLOUD_ACCESS_KEY=... ALICLOUD_SECRET_KEY=...
#   export TF_VAR_instance_password='...'   # plus any TF_VAR_* secrets you changed
#   ./deploy.sh [--seed]
#
# What it does:
#   1. terraform apply (idempotent)
#   2. first run: uploads scripts/bootstrap.sh -> installs Docker, self-signed
#      certs, ufw SSH restriction
#   3. rsyncs the repo to /opt/app (excludes .env, node_modules, .git, infra)
#   4. renders .env from Terraform variables onto the server
#   5. docker compose --profile prod up -d --build
#
# Requires: terraform, rsync, sshpass (sudo apt install sshpass)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REMOTE_DIR="/opt/app"
SEED=0
[[ "${1:-}" == "--seed" ]] && SEED=1

command -v terraform >/dev/null || { echo "terraform not found" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync not found" >&2; exit 1; }
command -v sshpass >/dev/null || { echo "sshpass not found (sudo apt install sshpass)" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found (sudo apt install jq)" >&2; exit 1; }

cd "$SCRIPT_DIR"

echo "==> terraform apply"
terraform apply -auto-approve

IP="$(terraform output -raw public_ip)"
PASS="$(terraform output -raw instance_password)"

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)
ssh_cmd() { sshpass -p "$PASS" ssh "${SSH_OPTS[@]}" "root@$IP" "$@"; }

echo "==> waiting for SSH on $IP"
for _ in $(seq 1 60); do
  if ssh_cmd "true" 2>/dev/null; then break; fi
  sleep 5
done
ssh_cmd "true"

if ! ssh_cmd "test -f $REMOTE_DIR/.bootstrapped"; then
  echo "==> bootstrapping server (docker + certs + ufw)"
  CIDRS="$(terraform output -json ssh_allowed_cidrs | jq -r 'join(" ")')"
  sshpass -p "$PASS" scp "${SSH_OPTS[@]}" "$SCRIPT_DIR/scripts/bootstrap.sh" "root@$IP:/tmp/bootstrap.sh"
  ssh_cmd "SSH_ALLOWED_CIDRS='$CIDRS' bash /tmp/bootstrap.sh && mkdir -p $REMOTE_DIR && touch $REMOTE_DIR/.bootstrapped"
fi

echo "==> syncing code to root@$IP:$REMOTE_DIR"
rsync -az --delete \
  -e "sshpass -p $PASS ssh ${SSH_OPTS[*]}" \
  --exclude '.git' \
  --exclude 'infra' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'ssl' \
  "$PROJECT_ROOT/" "root@$IP:$REMOTE_DIR/"

echo "==> writing /opt/app/.env from Terraform variables"
terraform output -raw rendered_env | ssh_cmd "cat > $REMOTE_DIR/.env && chmod 600 $REMOTE_DIR/.env"

echo "==> building and starting containers"
ssh_cmd "cd $REMOTE_DIR && docker compose --profile prod up -d --build"

if [[ "$SEED" == "1" ]]; then
  echo "==> seeding demo data"
  ssh_cmd "cd $REMOTE_DIR && docker compose run --rm seed"
fi

echo ""
echo "============================================================"
echo " Deployed! (self-signed cert: accept the browser warning)"
echo "   App: https://$IP"
echo "   API: https://$IP/api/v1"
echo "   SSH: ssh root@$IP"
echo "============================================================"
