# Deploy backend to Railway

## 1. Install Railway CLI (optional)

```bash
npm i -g @railway/cli
railway login
```

## 2. Deploy from the backend folder

### Option A: Deploy with Railway CLI

```bash
cd backend
railway init          # link to new or existing project
railway up            # build Dockerfile and deploy
railway domain        # add a public domain, e.g. your-app.up.railway.app
```

### Option B: Deploy from GitHub

1. Push this repo to GitHub.
2. In [Railway](https://railway.app) → New Project → Deploy from GitHub repo.
3. Select the repo and set **Root Directory** to `backend` (so Dockerfile is used).
4. Add a public domain: Settings → Networking → Generate Domain.

## 3. Set environment variables

In Railway → your service → Variables, set (or leave defaults for testnet):

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | |
| `PORT` | (Railway sets this) | |
| `STELLAR_NETWORK` | `testnet` or `public` | |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Testnet RPC |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Testnet Horizon |
| `CORS_ORIGINS` | `*` or your app origins | Mobile apps ignore CORS |

For **mainnet** use:
- `STELLAR_NETWORK=public`
- `SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org` (or your RPC)
- `STELLAR_HORIZON_URL=https://horizon.stellar.org`

## 4. Connect the mobile app

After deploy, copy your public URL (e.g. `https://stellar-wallet-backend-production.up.railway.app`).

In the Flutter example app, set the backend URL:

**Option A – compile-time (recommended)**

```bash
flutter run --dart-define=BACKEND_BASE_URL=https://YOUR_RAILWAY_APP.up.railway.app
```

**Option B – change default in code**

Edit `example/lib/services/api/api_config.dart` and set `defaultValue` to your Railway URL:

```dart
defaultValue: 'https://YOUR_RAILWAY_APP.up.railway.app',
```

Then rebuild the app. The wallet home screen will load balances from your Railway backend.
