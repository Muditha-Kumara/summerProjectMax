# ---------------------------------------------------------------------------
# Security group (ECS firewall). Unlike the SAS console firewall, security
# groups CAN filter by source IP, so SSH is restricted to ssh_allowed_cidrs.
# bootstrap.sh additionally configures ufw inside the VM as defense-in-depth.
# ---------------------------------------------------------------------------

resource "alicloud_security_group" "app" {
  security_group_name = "${var.instance_name}-sg"
  vpc_id              = alicloud_vpc.app.id
}

resource "alicloud_security_group_rule" "web" {
  for_each          = toset(["80", "443"])
  type              = "ingress"
  ip_protocol       = "tcp"
  port_range        = "${each.value}/${each.value}"
  security_group_id = alicloud_security_group.app.id
  cidr_ip           = "0.0.0.0/0"
  description       = each.value == "80" ? "HTTP (redirects to HTTPS)" : "HTTPS (self-signed)"
}

resource "alicloud_security_group_rule" "ssh" {
  count             = length(var.ssh_allowed_cidrs)
  type              = "ingress"
  ip_protocol       = "tcp"
  port_range        = "22/22"
  security_group_id = alicloud_security_group.app.id
  cidr_ip           = var.ssh_allowed_cidrs[count.index]
  description       = "SSH (restricted)"
}
