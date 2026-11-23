# Vercel Deployment

1. Run `docs/NEON_FOLLOW_UP.sql` once in the Neon SQL Editor. The API requires the `graduated` student status, a unique exam month, and the durable rate-limit table.
2. Import the GitHub repository into Vercel and deploy the `main` branch. The Vite config selects Nitro's Vercel preset; use `bun run build` as the build command. Nitro produces the Vercel output and routes both pages and `/api/*` through the same server function; do not add a separate `/api` rewrite.
3. Add these environment variables to the Vercel project. Set the two `VITE_` variables for every environment that should use the live API; they are embedded during build.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string; server-only, never prefix it with `VITE_` |
| `SESSION_SECRET` | Random secret with at least 32 characters |
| `VITE_USE_MOCK_API` | `false` |
| `VITE_API_BASE_URL` | `/api` |

Generate a session secret locally with PowerShell or a terminal that has Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Paste the generated value directly into Vercel's `SESSION_SECRET` field. Do not commit it or put it in browser-visible `VITE_` variables. Redeploy after changing any environment variable because Vite variables are build-time values.

The initial admin email is the one inserted into Neon by the seed SQL (`admin@kidsparliament.edu`). The mock demo credentials shown by the app do not apply when `VITE_USE_MOCK_API=false`.
