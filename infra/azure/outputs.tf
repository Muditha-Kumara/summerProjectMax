output "public_ip" {
  description = "Public IP of the demo server."
  value       = local.public_ip
}

output "app_url" {
  description = "Demo URL (self-signed cert — accept the browser warning)."
  value       = "https://${local.public_ip}"
}

output "api_url" {
  description = "Backend API base URL."
  value       = "https://${local.public_ip}/api/v1"
}

output "vm_name" {
  description = "VM name (for az vm start / deallocate)."
  value       = azurerm_linux_virtual_machine.app.name
}

output "resource_group" {
  description = "Resource group name."
  value       = azurerm_resource_group.app.name
}

output "ssh_command" {
  description = "SSH into the demo server (password = TF_VAR_instance_password)."
  value       = "ssh ${var.admin_username}@${local.public_ip}"
}

output "instance_password" {
  description = "SSH password (needed by deploy-azure.sh; sensitive)."
  value       = var.instance_password
  sensitive   = true
}

output "ssh_allowed_cidrs" {
  description = "CIDRs allowed to reach SSH (enforced by NSG + ufw)."
  value       = var.ssh_allowed_cidrs
}

output "rendered_env" {
  description = "Rendered /opt/app/.env content for the demo server. Used by deploy-azure.sh; sensitive."
  value = templatefile("${path.module}/templates/env.tpl", {
    db_user              = var.db_user
    db_password          = var.db_password
    db_name              = var.db_name
    jwt_secret           = var.jwt_secret
    jwt_refresh_secret   = var.jwt_refresh_secret
    shelly_cloud_api_url = var.shelly_cloud_api_url
    shelly_auth_key      = var.shelly_auth_key
    shelly_server_id     = var.shelly_server_id
    use_virtual_shelly   = var.use_virtual_shelly
    nord_pool_api_url    = var.nord_pool_api_url
    nord_pool_area       = var.nord_pool_area
    use_mock_prices      = var.use_mock_prices ? "true" : "false"
    price_source         = var.price_source
    openweather_api_key  = var.openweather_api_key
    smtp_host            = var.smtp_host
    smtp_port            = var.smtp_port
    smtp_user            = var.smtp_user
    smtp_pass            = var.smtp_pass
    smtp_from            = var.smtp_from
    ai_api_key           = var.ai_api_key
    ai_model             = var.ai_model
    ai_endpoint          = var.ai_endpoint
    frontend_url         = "https://${local.public_ip}"
  })
  sensitive = true
}
