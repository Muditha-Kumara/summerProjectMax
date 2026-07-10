#!/bin/bash

# Generate self-signed SSL certificates for local development/testing
# These certificates will work for localhost and common local IPs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_ROOT/ssl"

echo "Generating self-signed SSL certificates..."

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/server.key" 2048

# Generate certificate with SAN (Subject Alternative Names)
# This allows the cert to work for localhost, 127.0.0.1, and common local IPs
openssl req -new -x509 \
    -key "$SSL_DIR/server.key" \
    -out "$SSL_DIR/server.crt" \
    -days 365 \
    -subj "/C=FI/ST=Uusimaa/L=Helsinki/O=LocalDev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.1.1,IP:192.168.0.1,IP:10.0.0.1"

# Create a combined PEM file (some tools prefer this)
cat "$SSL_DIR/server.crt" "$SSL_DIR/server.key" > "$SSL_DIR/server.pem"

# Set permissions
chmod 644 "$SSL_DIR/server.crt"
chmod 600 "$SSL_DIR/server.key"
chmod 644 "$SSL_DIR/server.pem"

echo "✓ SSL certificates generated successfully!"
echo ""
echo "Certificate files:"
echo "  - $SSL_DIR/server.crt (certificate)"
echo "  - $SSL_DIR/server.key (private key)"
echo "  - $SSL_DIR/server.pem (combined)"
echo ""
echo "To trust this certificate in your browser:"
echo "  1. Import server.crt into your browser's certificate store"
echo "  2. Or use 'openssl s_client -connect localhost:443' to test"
echo ""
echo "Note: Browsers will show a security warning for self-signed certs."
echo "      This is normal for local development."
