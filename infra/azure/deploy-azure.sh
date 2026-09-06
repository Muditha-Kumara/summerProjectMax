#!/usr/bin/env bash
# Deploy / redeploy the Smart Heating demo to the Azure student free-tier VM.
#
# Usage:
#   az login                      # once (student subscription must be active)
#   cd infra/azure
#   ./deploy-azure.sh [--no-seed] # seed runs by default; --no-seed to skip
#
# What it does (mirrors infra/deploy.sh on Alibaba):
#   1. Auto-loads TF_VAR_* secrets from the project root .env
#   2. Generates + persists an SSH password in .vmpass (gitignored) if unset
#   3. terraform apply (idempotent) -> B2ats_v2 VM (750 h/mo FREE student tier)
#   4. first run: bootstrap (Docker, 2 GB swap, self-signed certs, ufw)
#   5. rsyncs the repo to /opt/app, renders .env, compose up, optional seed
#
# Day-to-day cost control:
#   az vm deallocate -g spv1-rg -n spv1   # night: compute -> $0 (IP kept)
#   az vm start        -g spv1-rg -n spv1 # morning
#   terraform destroy                      # after the demo week: deletes all
#
# Requires: terraform, az (logged in), rsync, sshpass, jq
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
REMOTE_DIR="/opt/app"
SEED=1
[[ "${1:-}" == "--no-seed" ]] && SEED=0

# ---------------------------------------------------------------------------
# Azure auth: reuse the active `az login` session (azurerm provider falls
# back to Azure CLI credentials when no service principal is configured).
# ---------------------------------------------------------------------------
command -v az >/dev/null || { echo "az CLI not found" >&2; exit 1; }
if ! az account show >/dev/null 2>&1; then
  echo "not logged in — run: az login" >&2
  exit 1
fi
export ARM_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
export ARM_TENANT_ID="$(az account show --query tenantId -o tsv)"
echo "==> using subscription $(az account show --query name -o tsv) ($ARM_SUBSCRIPTION_ID)"

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
      TF_VAR_ai_api_key TF_VAR_ai_model TF_VAR_ai_endpoint \
      TF_VAR_price_source TF_VAR_use_virtual_shelly

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
      JWT_REFRESH_SECRET)   export TF_VAR_jwt_refresh_secret="$value" ;;
      SHELLY_AUTH_KEY)      export TF_VAR_shelly_auth_key="$value" ;;
      SHELLY_SERVER_ID)     export TF_VAR_shelly_server_id="$value" ;;
      SHELLY_CLOUD_API_URL) export TF_VAR_shelly_cloud_api_url="$value" ;;
      NORD_POOL_API_URL)    export TF_VAR_nord_pool_api_url="$value" ;;
      NORD_POOL_AREA)       export TF_VAR_nord_pool_area="$value" ;;
      USE_MOCK_PRICES)      export TF_VAR_use_mock_prices="$value" ;;
      PRICE_SOURCE)         export TF_VAR_price_source="$value" ;;
      USE_VIRTUAL_SHELLY)   export TF_VAR_use_virtual_shelly="$value" ;;
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

# ---------------------------------------------------------------------------
# SSH/instance password: persist it across runs. Changing admin_password on
# an existing VM would force terraform to DESTROY + recreate it, so the
# generated value is stored in .vmpass (gitignored) and reused.
# ---------------------------------------------------------------------------
if [[ -z "${TF_VAR_instance_password:-}" ]]; then
  PASS_FILE="$SCRIPT_DIR/.vmpass"
  if [[ -f "$PASS_FILE" ]]; then
    TF_VAR_instance_password="$(cat "$PASS_FILE")"
    echo "==> reusing VM password from $PASS_FILE"
  else
    # 20 chars, guaranteed upper/lower/digit/symbol (Azure complexity rules)
    TF_VAR_instance_password="$(openssl rand -base64 18)Aa1@"
    TF_VAR_instance_password="${TF_VAR_instance_password//[^a-zA-Z0-9]/}"Aa1@
    printf '%s' "$TF_VAR_instance_password" > "$PASS_FILE"
    chmod 600 "$PASS_FILE"
    echo "==> generated VM password -> $PASS_FILE (gitignored, keep it!)"
  fi
fi
export TF_VAR_instance_password

command -v terraform >/dev/null || { echo "terraform not found" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync not found" >&2; exit 1; }
command -v sshpass >/dev/null || { echo "sshpass not found (sudo apt install sshpass)" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found (sudo apt install jq)" >&2; exit 1; }

cd "$SCRIPT_DIR"

echo "==> terraform apply"
terraform apply -auto-approve

IP="$(terraform output -raw public_ip)"
PASS="$TF_VAR_instance_password"
VM="$(terraform output -raw vm_name)"
RG="$(terraform output -raw resource_group)"

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)
ssh_cmd() { sshpass -p "$PASS" ssh "${SSH_OPTS[@]}" "azureuser@$IP" "$@"; }

echo "==> waiting for SSH on $IP"
for _ in $(seq 1 60); do
  if ssh_cmd "true" 2>/dev/null; then break; fi
  sleep 5
done
ssh_cmd "true"

# Marker lives in ~ (not /opt/app) so `rsync --delete` never wipes it.
if ! ssh_cmd "test -f ~/.app_bootstrapped"; then
  echo "==> bootstrapping server (docker + swap + certs + ufw)"
  CIDRS="$(terraform output -json ssh_allowed_cidrs | jq -r 'join(" ")')"
  ssh_cmd "echo '$PASS' | sudo -S mkdir -p $REMOTE_DIR && echo '$PASS' | sudo -S chown azureuser $REMOTE_DIR"
  sshpass -p "$PASS" scp "${SSH_OPTS[@]}" "$SCRIPT_DIR/scripts/bootstrap-azure.sh" "azureuser@$IP:/tmp/bootstrap.sh"
  ssh_cmd "echo '$PASS' | sudo -S env PUBLIC_IP='$IP' SSH_ALLOWED_CIDRS='$CIDRS' bash /tmp/bootstrap.sh" \
    && ssh_cmd "touch ~/.app_bootstrapped"
fi

echo "==> syncing code to azureuser@$IP:$REMOTE_DIR"
rsync -az --delete \
  -e "sshpass -p $PASS ssh ${SSH_OPTS[*]}" \
  --exclude '.git' \
  --exclude 'infra' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'ssl' \
  "$PROJECT_ROOT/" "azureuser@$IP:$REMOTE_DIR/"

echo "==> writing $REMOTE_DIR/.env from Terraform variables"
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
echo "   SSH: ssh azureuser@$IP   (password in .vmpass)"
echo ""
echo " Nightly: az vm deallocate -g $RG -n $VM   # compute -> \$0, IP kept"
echo " Morning: az vm start        -g $RG -n $VM"
echo " Teardown after demo: terraform destroy"
echo "============================================================"
