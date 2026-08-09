# ---------------------------------------------------------------------------
# ECS pay-as-you-go demo server + EIP.
#
# Why ECS instead of Simple Application Server (SAS)?
# SAS is prepaid (Subscription) and this account fails with
# SYNC_PAYMENT_NOT_SUPPORT when the API tries to auto-pay the order.
# ECS PostPaid needs no prepaid order, costs ~the same while running,
# and can be STOPPED when not demoing for ~zero compute cost.
#
# Cost control: stop the instance from the ECS console (or `aliyun ecs
# StopInstance --InstanceId ...`) when idle. With the PayByTraffic EIP you
# pay almost nothing while stopped. `terraform destroy` fully deletes
# everything here (unlike SAS).
# ---------------------------------------------------------------------------

locals {
  # data.alicloud_zones validates available_disk_category against a fixed enum
  # that lacks cloud_essd_entry; ESSD Entry is sold in every zone that has
  # ESSD, so filter zones by cloud_essd in that case.
  zone_disk_filter = var.system_disk_category == "cloud_essd_entry" ? "cloud_essd" : var.system_disk_category
}

data "alicloud_zones" "default" {
  available_resource_creation = "VSwitch"
  available_instance_type     = var.instance_type
  available_disk_category     = local.zone_disk_filter
}

data "alicloud_images" "ubuntu" {
  owners       = "system"
  name_regex   = "^ubuntu_22_04"
  architecture = "x86_64" # instance families (e/u1/u2i/...) are Intel x86_64; without this, most_recent can pick an arm64 image -> InvalidInstanceType.NotSupported
  most_recent  = true
}

resource "alicloud_vpc" "app" {
  vpc_name   = "${var.instance_name}-vpc"
  cidr_block = "172.16.0.0/16"
}

resource "alicloud_vswitch" "app" {
  vpc_id       = alicloud_vpc.app.id
  cidr_block   = "172.16.1.0/24"
  zone_id      = data.alicloud_zones.default.zones[0].id
  vswitch_name = "${var.instance_name}-vsw"
}

resource "alicloud_instance" "app" {
  instance_name        = var.instance_name
  image_id             = data.alicloud_images.ubuntu.images[0].id
  instance_type        = var.instance_type
  security_groups      = [alicloud_security_group.app.id]
  vswitch_id           = alicloud_vswitch.app.id
  system_disk_category = var.system_disk_category
  system_disk_size     = 40
  password             = var.instance_password

  instance_charge_type       = "PostPaid"
  internet_max_bandwidth_out = 0 # public traffic goes through the EIP

  # First-boot provisioning (Docker, self-signed certs, ufw) is done by
  # scripts/bootstrap.sh, uploaded and run by deploy.sh over SSH.
}

resource "alicloud_eip_address" "app" {
  address_name         = "${var.instance_name}-eip"
  bandwidth            = "5"
  internet_charge_type = "PayByTraffic"
  payment_type         = "PayAsYouGo"
}

resource "alicloud_eip_association" "app" {
  allocation_id = alicloud_eip_address.app.id
  instance_id   = alicloud_instance.app.id
}

locals {
  public_ip = alicloud_eip_address.app.ip_address
}
