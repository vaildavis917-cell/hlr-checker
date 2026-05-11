# hlr-checker

Self-hosted phone-number (HLR) and email validation service. UI is branded as **DataCheck Pro**.

- **HLR**: bulk lookups via [Seven.io](https://www.seven.io/) — operator, network type, validity, GSM error code, ported/roaming status, health score
- **Email**: bulk validation via [MillionVerifier](https://www.millionverifier.com/) — good / bad / catch-all / unknown, role detection, free-provider detection
- Admin panel with per-user role/limit/permission management, telegram notifications for access requests, action audit log

## Stack

| Layer | What |
|-------|------|
| Frontend | React 19 + TypeScript, Vite, Tailwind 4, shadcn/ui, tRPC client, wouter |
| Backend  | Node 22, Express 4, tRPC 11, WebSocket (`/ws`) for live batch progress |
| DB       | MySQL 8 / TiDB via Drizzle ORM (auto-migration on boot) |
| Auth     | httpOnly session cookie, bcrypt password hashing, account lockout after 5 failed logins |
| Process  | pm2 (systemd-managed in production) |

## Repository layout

```
client/                    React app
  src/pages/               Top-level pages (Home, EmailValidator, Admin, History, etc.)
  src/hooks/useWebSocket   Subscribes to batch progress over WS
  src/lib/trpc             tRPC client
server/
  _core/                   trpc setup, websocket server, context, cookies, env
  routers/                 tRPC routers (one per domain — split from old monolith)
    index.ts               appRouter assembly
    hlr.ts                 HLR endpoints + EXPORT_FIELDS
    email.ts               Email endpoints
    admin.ts               adminProcedure + admin endpoints
    auth.ts                Login / setup / sessions / login history
    exportTemplates.ts     User export templates
  batch.ts                 Shared batch workers (performHlrLookup,
                           processRemainingNumbers, processRemainingEmails,
                           autoResumeInterruptedBatches)
  routers.ts               Backwards-compat barrel re-exporting from routers/
  db.ts                    All DB access (Drizzle queries)
  auth.ts                  Login / session helpers
  millionverifier.ts       MillionVerifier API client
  telegram.ts              Telegram bot for access-request notifications
  phoneUtils.ts            Phone normalization / duplicate detection
drizzle/                   DB schema + migrations
docs/                      Audit reports and historical notes
```

## Batch processing model

Batches run **asynchronously** — the HTTP handler creates the batch row, fires the
worker with `.catch()`, and returns. Progress is broadcast over WebSocket.

- `processRemainingNumbers` is the single HLR worker. It checks for graceful
  shutdown and admin pause every 10 iterations and unwinds cleanly.
- `processRemainingEmails` is the email equivalent.
- On server start, `autoResumeInterruptedBatches` picks up any batch with status
  `processing` or `paused`, flips paused → processing (the worker's pause check
  would otherwise stop it on iteration 10), and hands it back to the worker.

Don't add a fourth copy of the processing loop. Both the user's startBatch /
resumeBatch endpoints and the admin's resumeBatch all delegate to these workers
— pass `options.debitUserId` + `options.completionAction` for billing/logging.

## Setup

Requirements: Node 22+, pnpm 10+, MySQL 8+ (or TiDB).

```bash
git clone git@github.com:vaildavis917-cell/hlr-checker.git
cd hlr-checker
pnpm install
cp .env.example .env  # fill in the values below
pnpm dev              # http://localhost:3000, migrations apply on first boot
```

Production:

```bash
pnpm build
NODE_ENV=production node dist/index.js
# or, via pm2 (see deployment section)
```

## Env vars

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | yes | ≥32 chars; signs the session cookie |
| `SEVEN_IO_API_KEY` | yes (for HLR) | Get from seven.io |
| `MILLIONVERIFIER_API_KEY` | yes (for email) | Get from millionverifier.com |
| `PORT` | no | Default 3000; auto-bumps if taken |
| `VITE_OAUTH_PORTAL_URL` / `VITE_APP_ID` | no | Only set if integrating with the Manus OAuth portal; otherwise the app falls back to local `/login` |

## Deployment (current production setup)

The server (`data-chek.com`) runs the app under the `deploy` user, managed by pm2,
which is brought up at boot by a systemd unit:

```ini
# /etc/systemd/system/pm2-deploy.service
[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
Environment=PM2_HOME=/home/deploy/.pm2
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 kill
```

Deploy flow:

```bash
ssh deploy@server
cd /var/www/hlr-checker
git pull
pnpm install
pnpm build
pm2 reload hlr-checker
pm2 save                       # persists the process list for next reboot
```

`nginx` terminates TLS and proxies to `127.0.0.1:3000`. WebSocket upgrade
(`/ws`) is forwarded transparently — keep `proxy_set_header Upgrade` and
`Connection "upgrade"` if you re-touch the config.

## Health score (HLR)

Computed per result, 0–100. Mostly used to rank a batch.

| Component | Max | Awarded when |
|-----------|-----|--------------|
| Validity | 40 | `valid_number == "valid"` (20 for `unknown`) |
| Reachability | 25 | `reachable == "reachable"` (10 for `unknown`) |
| Ported | 15 | `ported == "not_ported"` (10 for `ported`) |
| Roaming | 10 | `roaming == "not_roaming"` (5 for `roaming`) |
| Network type | 10 | `mobile` (7 for `fixed_line_or_mobile`) |

## GSM error codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Use it |
| 1 / 5 / 9 / 12 | Bad number / blocked | Treat as invalid (the batch worker does this automatically) |
| 6 | Absent subscriber | Retry later |
| 7 / 13 | Calls barred / blocked | Manual review |
| 8 | Roaming barred | Likely roaming |
| 11 | Teleservice unsupported | Wrong service type |
| 21 / 31 | Network failure | Retry later |
| 27 | Phone off / unreachable | Retry later |

## Tests

```bash
pnpm test           # vitest run, ~50s
pnpm check          # tsc --noEmit
```

`server/batch.test.ts` covers the auto-resume bug fix and the worker's
pause / shutdown handling. The older `*.test.ts` files mostly exercise
auth and permission boundaries through `appRouter.createCaller(ctx)`. A few
(`sevenio.test.ts`, `millionverifier.test.ts`) are integration checks that
will fail unless the corresponding API key is in the env.

## License

MIT — see [LICENSE](LICENSE).
