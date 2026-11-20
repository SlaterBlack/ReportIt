# ReportIt

ReportIt is an Angular frontend that reuses StoreIt's authentication and account APIs. Its reporting features can be added independently.

## Development

```bash
cd frontend
npm ci
cp .env.example .env
npm start
```

Set `STOREIT_API_URL` in `frontend/.env` to the shared StoreIt backend. The development server runs on port `4205` and proxies `/api` requests to StoreIt.

## Production

```bash
cd frontend
npm run build
npm run serve
```

The production frontend server uses `FRONTEND_HOST` and `FRONTEND_PORT` from `frontend/.env`, serves the Angular build, and proxies `/api` to StoreIt. Authentication uses `/api/auth`; account administration uses `/api/users`.

## Per-instance report branding

Report templates and PDF-generation code belong in the shared application source. Company names and logos are configured per deployment and must not be committed:

1. Copy `frontend/instance-brand.example.json` to `frontend/instance-brand.json`.
2. Set `companyName`, `logoLightPath`, and `logoDarkPath` as needed (for example, `/instance-assets/company-logo-black.png` and `/instance-assets/company-logo-white.png`).
3. Place company logos in `frontend/instance-assets/`. The directory is excluded from Git and served by the runtime frontend at `/instance-assets/`.

`instance-brand.json` and `instance-assets/` are excluded from Git. The production server exposes this configuration at `/brand-config.json` for shared templates and report-generation code to consume. The default light theme uses the black logo; the dark Retro theme uses the white logo. PDF output uses the black logo because its page background is white. The development server uses a generic, unbranded config.

## VQA reports

The shared VQA template starts with report details and an ordered content area. Authors can progressively add titled paragraph sections (each containing multiple paragraphs), tables, and images from the Add element panel, then reorder or remove them. Each new table starts with two columns and one row; table titles, column names, data types (text, number, date, yes/no, or bounded rating), rows, and columns are editable. Tables can be duplicated. Captioned JPEG, PNG, and WebP images can be added as standalone content or attached to table rows, and appear in a linked image appendix in the print layout. Each image upload is limited to 20 MB. Existing checklist and vision-score reports are converted to editable tables when opened.

Drafts, completed reports, and image attachments are stored in StoreIt's PostgreSQL database and are scoped to their owner. Before using the report API after deploying StoreIt changes, run the additive schema sync and restart the API:

```bash
cd /var/www/StoreIt/backend
npm run db:migrate
sudo systemctl restart storeit-backend
```

Use **Save as PDF** in a report to open the browser's print dialog, then choose its PDF destination. The report's image references and appendix captions use internal links in the print document.

The ReportIt HTTPS Nginx server block must allow the multipart image size:

```nginx
client_max_body_size 21m;
```

The checked-in HTTP site template includes this directive. If Certbot has already created the HTTPS server block, add it to that block as well, then run `sudo nginx -t` and `sudo systemctl reload nginx`.

## Production setup

The frontend listens on `127.0.0.1:2405`. StoreIt's environment must define `REPORTIT_PUBLIC_URL=https://reportit.ai3d.com.au/` so the service directory can advertise ReportIt to the other services.

Before deployment, set the DNS A record for `reportit.ai3d.com.au` to this server's public IPv4 address. Only configure an AAAA record if this server is reachable over IPv6. Allow inbound TCP ports 80 and 443; Certbot's HTTP validation requires port 80 to reach this server.

Build the production frontend before starting its systemd service:

```bash
cd /var/www/ReportIt/frontend
npm ci
npm run build
cd /var/www/ReportIt
```

Install and start the frontend unit, then enable the HTTP Nginx site and obtain a hostname-specific TLS certificate:

```bash
sudo install -m 0644 deploy/systemd/reportit-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reportit-frontend

sudo install -m 0644 deploy/nginx/reportit.conf /etc/nginx/sites-available/reportit
sudo ln -s /etc/nginx/sites-available/reportit /etc/nginx/sites-enabled/reportit
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --redirect -d reportit.ai3d.com.au
sudo systemctl restart storeit-backend
```

Certbot updates the installed Nginx site with HTTPS and redirects HTTP to HTTPS. StoreIt's environment must set `REPORTIT_PUBLIC_URL=https://reportit.ai3d.com.au/` and include `https://reportit.ai3d.com.au` in `CLIENT_ORIGINS` before restarting StoreIt. The service directory advertises ReportIt once its HTTPS endpoint responds successfully.
