# ---------------------------------------------------------------------------
# Infrastructure variables
# ---------------------------------------------------------------------------

variable "region" {
  description = "Alibaba Cloud region. eu-central-1 (Frankfurt) is close to the DashScope AI endpoint used by the backend."
  type        = string
  default     = "eu-central-1"
}

variable "instance_name" {
  description = "Name of the ECS instance."
  type        = string
  default     = "smart-heating-demo"
}

variable "instance_type" {
  description = "ECS instance type. ecs.e-c1m1.large = economy 2 vCPU / 2 GiB (cheapest general-purpose). If unavailable in the region, try ecs.t6-c1m2.large or ecs.u1-c1m2.large."
  type        = string
  default     = "ecs.e-c1m1.large"
}

variable "system_disk_category" {
  description = "System disk category. Verified via DescribeAvailableResource (eu-central-1): the e/u1/u2i families only accept ESSD-class disks (cloud_essd_entry is the cheapest); cloud_efficiency fails with InvalidSystemDiskCategory. Older families may still use cloud_efficiency."
  type        = string
  default     = "cloud_essd_entry"
}

variable "instance_password" {
  description = "SSH/root password for the instance. 8-30 chars, must contain 3 of: uppercase, lowercase, digits, special chars. Pass via TF_VAR_instance_password."
  type        = string
  sensitive   = true
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to reach SSH (port 22). Enforced by the security group AND ufw inside the VM. Use your home/office public IP, e.g. [\"203.0.113.10/32\"]. [\"0.0.0.0/0\"] allows everyone (not recommended)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ---------------------------------------------------------------------------
# Application secrets — rendered into /opt/app/.env on the server.
# Pass all of these via TF_VAR_* environment variables, never commit them.
# ---------------------------------------------------------------------------

variable "db_user" {
  description = "PostgreSQL user."
  type        = string
  default     = "appuser"
}

variable "db_password" {
  description = "PostgreSQL password."
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "myapp"
}

variable "jwt_secret" {
  description = "JWT signing secret (long random string)."
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret."
  type        = string
  sensitive   = true
  default     = ""
}

variable "shelly_cloud_api_url" {
  description = "Shelly Cloud API base URL."
  type        = string
  default     = "https://shelly-14-eu.shelly.cloud"
}

variable "shelly_auth_key" {
  description = "Shelly Cloud auth key."
  type        = string
  sensitive   = true
  default     = ""
}

variable "shelly_server_id" {
  description = "Shelly server ID."
  type        = string
  default     = ""
}

variable "nord_pool_api_url" {
  description = "Nord Pool market data API URL."
  type        = string
  default     = "https://www.nordpoolgroup.com/api/marketdata"
}

variable "nord_pool_area" {
  description = "Nord Pool price area."
  type        = string
  default     = "FI"
}

variable "use_mock_prices" {
  description = "Use mock spot prices instead of the real Nord Pool API (recommended for demos)."
  type        = bool
  default     = true
}

variable "openweather_api_key" {
  description = "OpenWeatherMap API key."
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_host" {
  description = "SMTP host for outgoing email."
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP port."
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username."
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password / app password."
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_from" {
  description = "From header for outgoing email."
  type        = string
  default     = "Smart Heating <noreply@example.com>"
}

variable "ai_api_key" {
  description = "AI API key (DashScope/OpenAI-compatible)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ai_model" {
  description = "AI model name."
  type        = string
  default     = "qwen-turbo"
}

variable "ai_endpoint" {
  description = "AI API endpoint URL."
  type        = string
  default     = ""
}
