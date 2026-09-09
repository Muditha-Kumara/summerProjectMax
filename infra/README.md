# Smart Heating — Low-Cost Demo Deployment (Alibaba Cloud + Terraform)

Deploys the whole stack on **one pay-as-you-go Alibaba Cloud ECS instance**
(economy 2 vCPU / 2 GiB + EIP, ~$8–12/month while running) in `eu-central-1`.
Your existing `docker compose --profile prod` runs unchanged: Postgres
container + backend + nginx frontend with self-signed HTTPS.

> Why ECS and not Simple Application Server (SAS)? SAS requires a prepaid
> subscription order that this account cannot auto-pay via API
> (`SYNC_PAYMENT_NOT_SUPPORT`). ECS PostPaid needs no prepaid order, is fully
> destroyable with `terraform destroy`, and can be **stopped when not demoing
> for ~zero compute cost**.

```
Internet ──► EIP ──► security group (80/443 open, 22 restricted)
                       └── ufw (defense-in-depth, SSH restricted)
                             └── Docker Compose @ /opt/app
                                   ├── frontend (nginx :80/:443, /api/ proxy)
                                   ├── backend  (node :3000, cron jobs inside)
                                   └── db       (postgres:15-alpine)
```

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
- `rsync`, `sshpass`, `jq` (`sudo apt install rsync sshpass jq`)
- Alibaba Cloud account + RAM user with **AccessKey** and permissions for
  ECS/VPC/EIP. For testing, `AliyunECSFullAccess`, `AliyunVPCFullAccess` and
  `AliyunEIPFullAccess` (or the broader `AdministratorAccess`) are enough.

## 1. Credentials & secrets (never commit these)

```bash
export ALICLOUD_ACCESS_KEY="your-access-key-id"
export ALICLOUD_SECRET_KEY="your-access-key-secret"

# Required
export TF_VAR_instance_password='S3cure-Instance-Pass!'   # 8-30 chars, 3 char classes
export TF_VAR_db_password='change-me-strong'
export TF_VAR_jwt_secret='long-random-string'

# Optional (empty = feature disabled)
export TF_VAR_jwt_refresh_secret='...'
export TF_VAR_openweather_api_key='...'
export TF_VAR_smtp_user='you@gmail.com'
export TF_VAR_smtp_pass='gmail-app-password'
export TF_VAR_ai_api_key='sk-...'
export TF_VAR_ai_endpoint='https://....maas.aliyuncs.com/compatible-mode/v1'
export TF_VAR_shelly_auth_key='...'
export TF_VAR_shelly_server_id='...'

# Recommended: lock SSH to your home/office IP
export TF_VAR_ssh_allowed_cidrs='["203.0.113.10/32"]'
```

> ⚠️ The old `backend/.env` values were shared in plaintext — rotate JWT,
> SMTP app password, OpenWeather and DashScope keys before going live anywhere.

## 2. Deploy

```bash
cd infra
./deploy.sh            # terraform apply + bootstrap + rsync + compose up
./deploy.sh --seed     # same, plus run the seed service for demo data
```

First run takes ~5–10 minutes (Docker install, image builds). Re-running is
idempotent and is how you **redeploy updates**: just run `./deploy.sh` again.

Outputs at the end:

```
App: https://<public-ip>        # self-signed cert → accept browser warning
API: https://<public-ip>/api/v1
SSH: ssh root@<public-ip>
```

## 3. Day-to-day operations

```bash
ssh root@<ip>                                  # password = TF_VAR_instance_password
cd /opt/app
docker compose --profile prod ps               # health check
docker compose --profile prod logs -f backend  # logs
docker compose --profile prod restart backend  # restart one service
docker compose run --rm seed                   # reseed demo data
```

Change a secret? Update the `TF_VAR_*` env var and rerun `./deploy.sh`
(renders a fresh `.env` and recreates containers).

## 4. Teardown & cost control

- **Stop when idle**: in the [ECS console](https://ecs.console.aliyun.com)
  select the instance → **Stop**. With the default PayByTraffic EIP and
  economy instances, a stopped server accrues almost no compute cost
  (only disk/EIP retention, a few cents/day). Start it again before demos.
- **Full teardown**: `terraform destroy` deletes everything (instance, EIP,
  network) and stops all billing. This works because ECS is PostPaid —
  unlike prepaid SAS, there is nothing left to release manually.

## Files

| File | Purpose |
|---|---|
| `versions.tf` | alicloud provider (region, credentials from env) |
| `variables.tf` | infra + app variables (secrets via `TF_VAR_*`) |
| `server.tf` | ECS instance + VPC/vswitch + EIP |
| `firewall.tf` | security group: 80, 443 open; 22 restricted |
| `outputs.tf` | IP, URLs, rendered `.env` |
| `templates/env.tpl` | `.env` template rendered onto the server |
| `scripts/bootstrap.sh` | one-time: Docker, self-signed certs, ufw |
| `deploy.sh` | apply + bootstrap + rsync + compose up |

## Troubleshooting

- **`InvalidInstanceType.NotSupported` / no zones found**: the economy type
  isn't stocked in that region — set `TF_VAR_instance_type='ecs.t6-c1m2.large'`
  or `'ecs.u1-c1m2.large'` and rerun.
- **Port 80/443 not reachable**: check the instance's security group rules in
  the ECS console (Terraform manages them; the console is the source of truth).
- **Voice assistant mic not working**: it needs HTTPS — you must accept the
  self-signed certificate warning first (click through on `https://<ip>`).
- **Backend can't reach DB**: containers talk via the `db` hostname inside
  compose; never set `DB_HOST` to the public IP.
