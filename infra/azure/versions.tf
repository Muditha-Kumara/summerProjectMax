terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
  # Authentication: picks up the active `az login` session automatically.
  # ARM_SUBSCRIPTION_ID is exported by deploy-azure.sh.
}
