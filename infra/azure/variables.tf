# ---------------------------------------------------------------------------
# Azure demo deployment — matches the student free-tier instance the portal
# allows: Standard_B2ats_v2 (2 vCPU / 4 GiB, AMD x64) in Poland Central,
# 750 h/month FREE on the "Azure for Students" subscription.
# Secrets use the same TF_VAR_* names as the Alibaba infra/ setup and are
# auto-loaded from the project root .env by deploy-azure.sh.
# ---------------------------------------------------------------------------

variable "resource_name" {
  description = "Base name for all resources."
  type        = string
  default     = "spv1"
}

variable "location" {
  description = "Azure region. B2ats_v2 free hours confirmed available in polandcentral."
  type        = string
  default     = "polandcentral"
}

variable "vm_size" {
  description = "Student free-tier size (750 h/mo). Do not change unless you want to pay."
  type        = string
  default     = "Standard_B2ats_v2"
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "instance_password" {
  description = "SSH password (azureuser). 12-72 chars, 3 of 4 char classes. Generated + saved by deploy-azure.sh if unset."
  type        = string
  sensitive   = true
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to reach SSH port 22."
  type        = list(string)
  default     = ["0.0.0.0/0"] # tighten to your home IP for real security
}

# --- App secrets consumed by ../templates/env.tpl --------------------------

variable "db_user" {
  type    = string
  default = "appuser"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type    = string
  default = "myapp"
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "jwt_refresh_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "shelly_cloud_api_url" {
  type    = string
  default = ""
}

variable "shelly_auth_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "shelly_server_id" {
  type      = string
  default   = ""
  sensitive = true
}

variable "nord_pool_api_url" {
  type    = string
  default = ""
}

variable "nord_pool_area" {
  type    = string
  default = "FINLAND"
}

variable "use_mock_prices" {
  type    = bool
  default = false
}

variable "openweather_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "smtp_host" {
  type    = string
  default = ""
}

variable "smtp_port" {
  type    = string
  default = "587"
}

variable "smtp_user" {
  type      = string
  default   = ""
  sensitive = true
}

variable "smtp_pass" {
  type      = string
  default   = ""
  sensitive = true
}

variable "smtp_from" {
  type    = string
  default = ""
}

variable "ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "ai_model" {
  type    = string
  default = ""
}

variable "ai_endpoint" {
  type    = string
  default = ""
}

variable "price_source" {
  type    = string
  default = ""
}

variable "use_virtual_shelly" {
  type    = string
  default = ""
}
