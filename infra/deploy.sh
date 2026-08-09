#!/usr/bin/env bash
# Deploy / redeploy the Smart Heating demo to the Alibaba Cloud instance.
#
# Usage:
#   cd infra
#   source myenv.sh          # loads ALICLOUD keys + TF_VAR_* secrets
#   ./deploy.sh [--no-seed]  # seed runs by default; --no-seed to skip
#
# What it does:
#   1. Auto-loads TF_VAR_* from the project root .env (API keys, SMTP, etc.)
#   2. terraform apply (idempotent)
#   3. first run: uploads scripts/bootstrap.sh -> installs Docker, self-signed
#      certs, ufw SSH restriction
#   4. rsyncs the repo to /opt/app (excludes .env, node_modules, .git, infra)
#   5. renders .env from Terraform variables onto the server
#   6. docker compose --profile prod up -d --build
#   7. seeds demo data (admin user + default rooms) unless --no-seed
#
# Requires: terraform, rsync, sshpass (sudo apt install sshpass)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REMOTE_DIR="/opt/app"
SEED=1
[[ "${1:-}" == "--no-seed" ]] && SEED=0

# ---------------------------------------------------------------------------
# Auto-load TF_VAR_* from the project root .env so API keys (OpenWeather,
# SMTP, AI, Shelly, etc.) are deployed without manual export.
# First unset stale values so old shell state never overrides real .env keys.
# ---------------------------------------------------------------------------
unset TF_VAR_db_user TF_VAR_db_password TF_VAR_db_name TF_VAR_jwt_secret \
      TF_VAR_jwt_refresh_secret TF_VAR_shelly_auth_key TF_VAR_shelly_server_id \
      TF_VAR_shelly_cloud_api_url TF_VAR_nord_pool_api_url TF_VAR_nord_pool_area \
      TF_VAR_use_mock_prices TF_VAR_openweather_api_key TF_VAR_smtp_host \
      TF_VAR_smtp_port TF_VAR_smtp_user TF_VAR_smtp_pass TF_VAR_smtp_from \
      TF_VAR_ai_api_key TF_VAR_ai_model TF_VAR_ai_endpoint

LOCAL_ENV="$PROJECT_ROOT/.env"
if [[ -f "$LOCAL_ENV" ]]; then
  echo "==> loading API keys from $LOCAL_ENV"
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    value="${value%%#*}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    value="${value#\"}" ; value="${value%\"}"
    value="${value#\'}" ; value="${value%\'}"
    case "$key" in
      POSTGRES_USER)        export TF_VAR_db_user="$value" ;;
      POSTGRES_PASSWORD)    export TF_VAR_db_password="$value" ;;
      POSTGRES_DB)          export TF_VAR_db_name="$value" ;;
      JWT_SECRET)           export TF_VAR_jwt_secret="$value" ;;
      SHELLY_AUTH_KEY)      export TF_VAR_shelly_auth_key="$value" ;;
      SHELLY_SERVER_ID)     export TF_VAR_shelly_server_id="$value" ;;
      SHELLY_CLOUD_API_URL) export TF_VAR_shelly_cloud_api_url="$value" ;;
      NORD_POOL_API_URL)    export TF_VAR_nord_pool_api_url="$value" ;;
      NORD_POOL_AREA)       export TF_VAR_nord_pool_area="$value" ;;
      USE_MOCK_PRICES)      export TF_VAR_use_mock_prices="$value" ;;
      OPENWEATHER_API_KEY)  export TF_VAR_openweather_api_key="$value" ;;
      SMTP_HOST)            export TF_VAR_smtp_host="$value" ;;
      SMTP_PORT)            export TF_VAR_smtp_port="$value" ;;
      SMTP_USER)            export TF_VAR_smtp_user="$value" ;;
      SMTP_PASS)            export TF_VAR_smtp_pass="$value" ;;
      SMTP_FROM)            export TF_VAR_smtp_from="$value" ;;
      OPENAI_API_KEY)       export TF_VAR_ai_api_key="$value" ;;
      AI_MODEL)             export TF_VAR_ai_model="$value" ;;
      AI_ENDPOINT)          export TF_VAR_ai_endpoint="$value" ;;
    esac
  done < "$LOCAL_ENV"
  echo "==> loaded: OPENWEATHER_API_KEY=${TF_VAR_openweather_api_key:+set} SMTP_USER=${TF_VAR_smtp_user:+set} AI_API_KEY=${TF_VAR_ai_api_key:+set}"
fi

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
  echo "==> seeding demo data (admin user + default rooms)"
  ssh_cmd "cd $REMOTE_DIR && docker compose run --rm seed"
else
  echo "==> skipping seed (--no-seed)"
fi

echo ""
echo "============================================================"
echo " Deployed! (self-signed cert: accept the browser warning)"
echo "   App: https://$IP"
echo "   API: https://$IP/api/v1"
echo "   SSH: ssh root@$IP"
echo "============================================================"
