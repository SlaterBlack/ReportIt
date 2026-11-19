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
