# ---------------------------------------------------------------------------
# Azure student free-tier demo server.
#
# Mirrors infra/server.tf (Alibaba ECS + EIP) but uses the instance the
# "Azure for Students" subscription allows for free:
#   Standard_B2ats_v2 — 750 h/month FREE (see portal Free services page),
#   billed $0 against the monthly free grant; only disk/IP are trivial.
#
# Cost control: `az vm deallocate` at night (compute -> $0, IP kept),
# `terraform destroy` after the demo week deletes everything.
# ---------------------------------------------------------------------------

locals {
  name      = var.resource_name
  public_ip = azurerm_public_ip.app.ip_address
}

resource "azurerm_resource_group" "app" {
  name     = "${local.name}-rg"
  location = var.location
}

resource "azurerm_virtual_network" "app" {
  name                = "${local.name}-vnet"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  address_space       = ["10.10.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "${local.name}-snet"
  resource_group_name  = azurerm_resource_group.app.name
  virtual_network_name = azurerm_virtual_network.app.name
  address_prefixes     = ["10.10.1.0/24"]
}

resource "azurerm_network_security_group" "app" {
  name                = "${local.name}-nsg"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
}

resource "azurerm_network_security_rule" "ssh" {
  name                        = "allow-ssh"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefixes     = var.ssh_allowed_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.app.name
  network_security_group_name = azurerm_network_security_group.app.name
}

resource "azurerm_network_security_rule" "http" {
  name                        = "allow-http"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.app.name
  network_security_group_name = azurerm_network_security_group.app.name
}

resource "azurerm_network_security_rule" "https" {
  name                        = "allow-https"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.app.name
  network_security_group_name = azurerm_network_security_group.app.name
}

# Standard SKU public IP: free while attached to the VM (Basic SKU bills ~$3/mo).
resource "azurerm_public_ip" "app" {
  name                = "${local.name}-ip"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "app" {
  name                = "${local.name}-nic"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.app.id
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                            = local.name
  location                        = azurerm_resource_group.app.location
  resource_group_name             = azurerm_resource_group.app.name
  network_interface_ids           = [azurerm_network_interface.app.id]
  size                            = var.vm_size
  admin_username                  = var.admin_username
  admin_password                  = var.instance_password
  disable_password_authentication = false # keeps the sshpass deploy flow

  os_disk {
    name                 = "${local.name}-osdisk"
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS" # covered by the 64 GB free disk grant
    disk_size_gb         = 32
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
}
