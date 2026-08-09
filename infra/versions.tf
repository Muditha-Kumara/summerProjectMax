terraform {
  required_version = ">= 1.5.0"

  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.266"
    }
  }
}

# Credentials are read from the environment — never put them in files:
#   export ALICLOUD_ACCESS_KEY="..."
#   export ALICLOUD_SECRET_KEY="..."
provider "alicloud" {
  region = var.region
}
