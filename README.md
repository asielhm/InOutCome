# InOutCome
Personal income and expense dashboard PWA backed by Google Apps Script + Google Sheets.

## Environment
Set these variables in Vercel. Never commit their real values:

- `GOOGLE_APPS_SCRIPT_URL`: your Apps Script `/exec` URL.
- `GOOGLE_APPS_SCRIPT_SECRET`: the secret configured in Apps Script.
- `DASHBOARD_PASSWORD`: the password used to open the dashboard.
- `DASHBOARD_SESSION_SECRET`: a different long random value used to protect the login cookie.

## Run
`npm install`
`npm run dev`

Then open http://localhost:3000.
