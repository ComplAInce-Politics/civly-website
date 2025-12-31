# CIVLY.AI Migration Gameplan: Wix → Digital Ocean

**Prepared:** December 2024
**Goal:** Full ownership of civly.ai - consolidate marketing site and product on Digital Ocean
**Timeline:** 3-5 days

---

## Overview

### Current State
```
civly.ai                              → Wix (marketing site)
verify-dev.compliance-ai-politics.com → Digital Ocean (product)
```

### Target State
```
civly.ai / www.civly.ai   → Digital Ocean (marketing site - static HTML)
app.civly.ai              → Digital Ocean (product frontend)
api.civly.ai              → Digital Ocean (product backend API)
```

### Why This Migration
- Single platform for all infrastructure
- Full control over site and product
- No Wix subscription (~$15-30/mo savings)
- Unified deployment and management
- Better performance and flexibility

---

## Phase 1: Preparation (Day 1)

### 1.1 Inventory & Access Checklist
- [ ] Confirm domain registrar access (where civly.ai DNS is managed)
- [ ] Document/screenshot current Wix DNS settings
- [ ] Get Digital Ocean droplet IP address
- [ ] Verify SSH access to droplet
- [ ] Plan SSL certificate strategy (Let's Encrypt via Certbot)

### 1.2 Marketing Site Assets
- [ ] Review redesigned HTML file: `civly_redesign.html`
- [ ] Make any final copy/design tweaks
- [ ] Update real contact info (email, phone, Calendly links)
- [ ] Create additional pages if needed:
  - `/about` - Team/company page
  - `/privacy` - Privacy policy
  - `/terms` - Terms of service
- [ ] Test mobile responsiveness
- [ ] Gather any images/assets from Wix to migrate

### 1.3 Prepare Digital Ocean
```bash
# Create directory structure on droplet
mkdir -p /var/www/civly.ai/public
mkdir -p /var/www/civly.ai/app
```

---

## Phase 2: Nginx Configuration (Day 1-2)

### 2.1 Install Nginx (if not present)
```bash
sudo apt update && sudo apt install nginx -y
```

### 2.2 Create Site Configuration
```bash
sudo nano /etc/nginx/sites-available/civly.ai
```

### 2.3 Nginx Config File
```nginx
# /etc/nginx/sites-available/civly.ai

# ===========================================
# Marketing site - www.civly.ai and civly.ai
# ===========================================
server {
    listen 80;
    server_name civly.ai www.civly.ai;

    root /var/www/civly.ai/public;
    index index.html;

    # Handle clean URLs
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# ===========================================
# Product app - app.civly.ai
# ===========================================
server {
    listen 80;
    server_name app.civly.ai;

    # Frontend (Vite/React)
    location / {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ===========================================
# API - api.civly.ai
# ===========================================
server {
    listen 80;
    server_name api.civly.ai;

    location / {
        proxy_pass http://localhost:8022;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2.4 Enable Site Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/civly.ai /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Phase 3: Deploy Marketing Site (Day 2)

### 3.1 Upload Marketing Site Files

**Option A: Direct SCP**
```bash
# From local machine
scp civly_redesign.html user@DROPLET_IP:/var/www/civly.ai/public/index.html
scp -r assets/ user@DROPLET_IP:/var/www/civly.ai/public/
```

**Option B: Git-based Deployment (Recommended)**
```bash
# On droplet
cd /var/www/civly.ai
git clone https://github.com/your-org/civly-marketing.git public
```

### 3.2 Expected Directory Structure
```
/var/www/civly.ai/public/
├── index.html          # Homepage (redesigned)
├── about.html          # Team/company page
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       ├── logo.svg
│       └── ...
└── favicon.ico
```

### 3.3 Set Correct Permissions
```bash
sudo chown -R www-data:www-data /var/www/civly.ai
sudo chmod -R 755 /var/www/civly.ai
```

---

## Phase 4: DNS Migration (Day 2-3)

### 4.1 Pre-Migration: Lower TTL
Before migration, lower TTL to 300 seconds (5 min) to allow fast rollback if needed.

### 4.2 Update DNS Records
Update at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_DROPLET_IP | 300 |
| A | www | YOUR_DROPLET_IP | 300 |
| A | app | YOUR_DROPLET_IP | 300 |
| A | api | YOUR_DROPLET_IP | 300 |

**If using Digital Ocean DNS:**
```bash
# Add domain to Digital Ocean
doctl compute domain create civly.ai

# Add A records
doctl compute domain records create civly.ai \
  --record-type A --record-name @ --record-data YOUR_DROPLET_IP

doctl compute domain records create civly.ai \
  --record-type A --record-name www --record-data YOUR_DROPLET_IP

doctl compute domain records create civly.ai \
  --record-type A --record-name app --record-data YOUR_DROPLET_IP

doctl compute domain records create civly.ai \
  --record-type A --record-name api --record-data YOUR_DROPLET_IP
```

### 4.3 DNS Propagation
- Typically takes 15-30 minutes
- Can take up to 48 hours in rare cases
- Verify with: `dig civly.ai` or `nslookup civly.ai`

---

## Phase 5: SSL Certificates (Day 3)

### 5.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Generate SSL Certificates
```bash
# Get certificates for all domains at once
sudo certbot --nginx \
  -d civly.ai \
  -d www.civly.ai \
  -d app.civly.ai \
  -d api.civly.ai

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose to redirect HTTP to HTTPS (recommended)
```

### 5.3 Verify Auto-Renewal
```bash
# Test renewal process
sudo certbot renew --dry-run

# Check certbot timer is active
sudo systemctl status certbot.timer
```

### 5.4 Verify Certificates
```bash
# Check certificate details
sudo certbot certificates

# Test SSL externally
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=civly.ai
```

---

## Phase 6: Update Application Configuration (Day 3)

### 6.1 Frontend Environment Variables
```bash
# Update frontend .env file
VITE_API_URL=https://api.civly.ai
VITE_APP_URL=https://app.civly.ai
```

### 6.2 Backend CORS Configuration
```python
# backend/app/core/config.py

CORS_ORIGINS = [
    "https://civly.ai",
    "https://www.civly.ai",
    "https://app.civly.ai",
    "http://localhost:3000",      # Keep for local dev
    "http://localhost:5174",      # Keep for local dev
]
```

### 6.3 Update Docker Compose Environment
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - CORS_ORIGINS=https://civly.ai,https://www.civly.ai,https://app.civly.ai
      - BASE_URL=https://api.civly.ai

  frontend:
    environment:
      - VITE_API_URL=https://api.civly.ai
```

### 6.4 Rebuild and Restart Services
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Phase 7: Testing & Verification (Day 3-4)

### 7.1 Endpoint Testing Checklist

| URL | Expected Result | Status |
|-----|-----------------|--------|
| https://civly.ai | Marketing homepage loads | [ ] |
| https://www.civly.ai | Marketing homepage loads | [ ] |
| http://civly.ai | Redirects to HTTPS | [ ] |
| https://app.civly.ai | Product app loads | [ ] |
| https://api.civly.ai/docs | API docs load | [ ] |
| https://api.civly.ai/health | Health check passes | [ ] |

### 7.2 Functionality Testing

- [ ] All marketing site links work
- [ ] Contact/CTA buttons work (mailto, calendly, etc.)
- [ ] Product login/signup works
- [ ] API calls from frontend succeed
- [ ] Mobile responsive on all pages
- [ ] SSL certificates show as valid (green lock)
- [ ] No mixed content warnings

### 7.3 SSL Verification Commands
```bash
# Check certificate from command line
curl -vI https://civly.ai 2>&1 | grep -A 6 "Server certificate"

# Check all domains
for domain in civly.ai www.civly.ai app.civly.ai api.civly.ai; do
  echo "Checking $domain..."
  curl -sI https://$domain | head -1
done
```

---

## Phase 8: Decommission Wix (Day 4-5)

### 8.1 Before Canceling Wix
- [ ] Download all images/media from Wix
- [ ] Export any content/copy not yet migrated
- [ ] Screenshot any pages for reference
- [ ] Confirm new site is fully functional

### 8.2 Cancel Wix Subscription
- Log into Wix account
- Cancel subscription/plan
- Remove any Wix DNS records if they exist

### 8.3 Post-Migration Cleanup
- [ ] Remove old Wix DNS entries
- [ ] Update any external services pointing to old URLs
- [ ] Update Google Search Console with new sitemap
- [ ] Update any social media links

---

## Phase 9: Monitoring & Maintenance

### 9.1 Set Up Uptime Monitoring
Free options:
- [UptimeRobot](https://uptimerobot.com) - 50 monitors free
- [Freshping](https://freshping.io) - 50 monitors free
- Digital Ocean built-in monitoring

Monitor these endpoints:
- https://civly.ai
- https://app.civly.ai
- https://api.civly.ai/health

### 9.2 Backup Strategy
```bash
# Add to crontab: weekly backup of marketing site
# Run: crontab -e

0 0 * * 0 tar -czf /backups/civly-marketing-$(date +\%Y\%m\%d).tar.gz /var/www/civly.ai/public
```

### 9.3 Log Monitoring
```bash
# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# View docker logs
docker-compose logs -f
```

---

## Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Digital Ocean Droplet                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Nginx (reverse proxy + SSL termination via Certbot)       │
│   │                                                          │
│   ├── civly.ai / www.civly.ai                               │
│   │   └── Static files: /var/www/civly.ai/public            │
│   │       ├── index.html (marketing homepage)               │
│   │       ├── about.html                                    │
│   │       ├── privacy.html                                  │
│   │       └── assets/                                       │
│   │                                                          │
│   ├── app.civly.ai                                          │
│   │   └── Proxy → localhost:5174 (Vite/React frontend)      │
│   │                                                          │
│   └── api.civly.ai                                          │
│       └── Proxy → localhost:8022 (FastAPI backend)          │
│                                                              │
│   Docker Compose Services                                    │
│   ├── backend (FastAPI)     :8022                           │
│   ├── frontend (Vite)       :5174                           │
│   ├── postgres              :5432                           │
│   ├── redis                 :6379                           │
│   ├── minio                 :9000                           │
│   └── celery workers                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Commands

```bash
# === Nginx ===
sudo systemctl status nginx          # Check status
sudo nginx -t                        # Test config
sudo systemctl reload nginx          # Reload config
sudo systemctl restart nginx         # Full restart

# === SSL ===
sudo certbot certificates            # List certificates
sudo certbot renew --dry-run         # Test renewal
sudo certbot renew                   # Force renewal

# === Logs ===
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# === Docker ===
docker-compose ps                    # Check running services
docker-compose logs -f               # Follow all logs
docker-compose logs -f backend       # Follow specific service
docker-compose restart               # Restart all
docker-compose down && docker-compose up -d  # Full restart

# === DNS ===
dig civly.ai                         # Check DNS resolution
nslookup civly.ai                    # Alternative DNS check
curl -I https://civly.ai             # Test HTTP response

# === Ports ===
sudo netstat -tlnp                   # See what's listening
sudo lsof -i :80                     # Check port 80
sudo lsof -i :443                    # Check port 443
```

---

## Rollback Plan

If something goes wrong:

1. **DNS Rollback:** Point DNS back to Wix (keep Wix active until migration verified)
2. **Nginx Rollback:** `sudo systemctl stop nginx` to stop serving
3. **SSL Issues:** Temporarily disable HTTPS redirect in nginx config

---

## Task Assignment Summary

| Task | Owner | Est. Time |
|------|-------|-----------|
| Finalize marketing site HTML/assets | Design/Frontend | 2-4 hours |
| Set up nginx configuration | DevOps/Backend | 1-2 hours |
| Deploy marketing site files | DevOps | 30 min |
| Update DNS records | Domain Owner | 30 min |
| Generate SSL certificates | DevOps | 30 min |
| Update app environment variables | Backend | 1 hour |
| Testing & verification | QA/All | 2-3 hours |
| Cancel Wix subscription | Admin | 15 min |
| Set up monitoring | DevOps | 1 hour |

**Total Estimated Time:** 10-15 hours spread over 3-5 days

---

## Success Criteria

- [ ] All four domains resolve correctly (civly.ai, www, app, api)
- [ ] SSL certificates valid on all domains
- [ ] Marketing site loads fast (<2s)
- [ ] Product app fully functional
- [ ] API endpoints accessible
- [ ] No Wix dependency remaining
- [ ] Monitoring in place
- [ ] Team knows how to deploy updates

---

## Questions / Blockers

*Add any questions or blockers here during implementation:*

1.
2.
3.

---

**Document Owner:** [Your Name]
**Last Updated:** December 2024
**Status:** Ready for Review
