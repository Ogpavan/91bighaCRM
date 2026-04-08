# Deployment Guide

This repository is prepared for:

- `91bigha.com` and `www.91bigha.com` -> Next.js website and API
- `crm.91bigha.com` -> static CRM frontend, with `/api/*` proxied to the Next.js API

## 1. Server prerequisites

Install the required packages on the Linux server:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Install Node.js 20 or newer before building and running the app.

## 2. Build deployment bundles

Run this in the project root:

```bash
npm install
npm --prefix frontend install
bash scripts/prepare-deployment.sh
```

That creates:

- `.deploy/site` -> standalone Next.js runtime bundle
- `.deploy/crm` -> static CRM files

## 3. Create server directories

```bash
sudo mkdir -p /var/www/91bigha/app
sudo mkdir -p /var/www/91bigha/crm
sudo mkdir -p /var/www/91bigha/shared
sudo mkdir -p /var/www/91bigha/shared/uploads/branding
sudo chown -R www-data:www-data /var/www/91bigha/shared/uploads
```

## 4. Copy files to the server locations

Copy the prepared bundles:

```bash
sudo cp -R .deploy/site/. /var/www/91bigha/app/
sudo cp -R .deploy/crm/. /var/www/91bigha/crm/
```

Copy the environment file template and then edit it:

```bash
sudo cp deploy/env/site.env.example /var/www/91bigha/shared/site.env
sudo nano /var/www/91bigha/shared/site.env
```

Set real values for:

- `DB_USER`
- `DB_PASSWORD`
- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `UPLOADS_DIR` if you want a path other than `/var/www/91bigha/shared/uploads`

## 5. Install the systemd service

```bash
sudo cp deploy/systemd/91bigha-web.service /etc/systemd/system/91bigha-web.service
sudo systemctl daemon-reload
sudo systemctl enable 91bigha-web
sudo systemctl start 91bigha-web
sudo systemctl status 91bigha-web
```

## 6. Install the Nginx site

```bash
sudo cp deploy/nginx/91bigha.conf /etc/nginx/sites-available/91bigha.conf
sudo ln -sf /etc/nginx/sites-available/91bigha.conf /etc/nginx/sites-enabled/91bigha.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Enable SSL

Make sure DNS already points both domains to the server IP, then run:

```bash
sudo certbot --nginx -d 91bigha.com -d www.91bigha.com -d crm.91bigha.com
```

## 8. Update deployments

For each new deployment:

```bash
npm install
npm --prefix frontend install
bash scripts/prepare-deployment.sh
sudo cp -R .deploy/site/. /var/www/91bigha/app/
sudo cp -R .deploy/crm/. /var/www/91bigha/crm/
sudo systemctl restart 91bigha-web
sudo systemctl reload nginx
```

## Notes

- The CRM defaults to same-origin API requests, so `crm.91bigha.com/api/*` must stay proxied to the Next.js app.
- If you want the CRM to call a different API host, set `VITE_API_BASE_URL` before building the frontend.
- The current Nginx file starts as plain HTTP. `certbot --nginx` will update it for HTTPS automatically.
