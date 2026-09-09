# SSL/HTTPS Setup Guide

This project now supports HTTPS for both production and development environments using self-signed certificates.

## Why HTTPS?

HTTPS is required for:
- **Microphone access** in browsers (needed for VoiceAssistant)
- **Geolocation API** access
- **Service Workers** and other modern web features
- Secure communication between browser and server

## Quick Start

### 1. Generate SSL Certificates

```bash
./scripts/generate-ssl-certs.sh
```

This creates self-signed certificates in the `ssl/` directory:
- `server.crt` - Certificate file
- `server.key` - Private key
- `server.pem` - Combined certificate + key

### 2. Run with HTTPS

**Production mode:**
```bash
docker compose --profile prod up -d
```

Access your app at: `https://localhost`

**Development mode:**
```bash
docker compose --profile dev up -d
```

Access your app at: `https://localhost:5173`

## Browser Security Warning

Since these are self-signed certificates, browsers will show a security warning. This is **normal and expected** for local development.

### How to Proceed Past the Warning

**Chrome/Edge:**
1. Click "Advanced" or "Details"
2. Click "Proceed to localhost (unsafe)" or similar
3. The site will load normally

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**To permanently trust the certificate:**

Import `ssl/server.crt` into your browser's certificate store:

**Chrome:**
1. Settings → Privacy and security → Security
2. Manage certificates → Authorities tab
3. Import `ssl/server.crt`
4. Trust this certificate for identifying websites

**Firefox:**
1. Settings → Privacy & Security
2. Certificates → View Certificates
3. Import `ssl/server.crt`
4. Trust this CA to identify websites

## Certificate Details

The generated certificate includes:
- **Common Name (CN):** localhost
- **Subject Alternative Names (SAN):**
  - DNS: localhost
  - DNS: *.localhost
  - IP: 127.0.0.1
  - IP: 192.168.1.1
  - IP: 192.168.0.1
  - IP: 10.0.0.1
- **Validity:** 365 days

## Using Your Own Certificates

If you have real SSL certificates (e.g., from Let's Encrypt):

1. Replace the files in `ssl/` directory:
   - `server.crt` - Your certificate
   - `server.key` - Your private key

2. Restart the containers:
   ```bash
   docker compose --profile prod restart frontend
   ```

## Production Deployment

For production deployment with a real domain:

1. **Get a domain name** and point it to your server's public IP

2. **Use Let's Encrypt** (recommended):
   ```bash
   # Install certbot
   sudo apt install certbot
   
   # Generate certificate
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Copy certificates
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/server.crt
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/server.key
   ```

3. **Set up auto-renewal** with cron:
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet && docker compose --profile prod restart frontend
   ```

## Troubleshooting

### "Permission denied" when generating certificates

The `ssl/` directory might be owned by root. Fix with:
```bash
sudo rm -rf ssl
mkdir ssl
./scripts/generate-ssl-certs.sh
```

### Microphone still not working

1. Make sure you're accessing the site via `https://` (not `http://`)
2. Check browser console for permission errors
3. Ensure you've accepted the certificate warning
4. Try in an incognito/private window

### Certificate expired

Regenerate the certificates:
```bash
rm -rf ssl/*
./scripts/generate-ssl-certs.sh
docker compose --profile prod restart frontend
```

### Port 443 already in use

Check what's using port 443:
```bash
sudo lsof -i :443
```

Stop the conflicting service or change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8443:443"  # Use https://localhost:8443 instead
```

## Security Notes

⚠️ **Never commit the `ssl/` directory to version control** - it's already in `.gitignore`

⚠️ **Self-signed certificates are for development only** - use real certificates (Let's Encrypt) for production

⚠️ **Keep private keys secure** - never share `server.key` publicly

## Architecture

```
Production (port 443):
Browser → nginx (HTTPS) → backend:3000 (HTTP)

Development (port 5173):
Browser → Vite dev server (HTTPS) → backend-dev:3000 (HTTP)
```

Both setups terminate SSL at the frontend layer and communicate internally over HTTP.
