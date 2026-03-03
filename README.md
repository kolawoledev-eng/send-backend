# Stellar Wallet Backend

Node.js + TypeScript API for the Stellar wallet app. Uses **@stellar/stellar-sdk** for Horizon and Soroban RPC (mainnet-ready).

## Structure

```
backend/
├── src/
│   ├── config/         # Env and Stellar config
│   ├── middleware/     # Error, validation
│   ├── routes/        # health, wallet, stellar
│   ├── services/      # StellarService (Horizon + Soroban)
│   ├── app.ts
│   └── index.ts
├── tests/
├── Dockerfile
├── railway.json
├── .env.example
└── package.json
```

## Setup

1. Copy env and set RPC/Horizon URLs:

```bash
cp .env.example .env
# Edit .env: SOROBAN_RPC_URL, STELLAR_HORIZON_URL
```

2. Install and run:

```bash
npm install
npm run dev
```

3. For production (build then start):

```bash
npm run build
npm start
```

## Mainnet

The same keypairs work on testnet and mainnet. To use **mainnet**:

1. **Backend (Railway)** – In your service variables set:
   - `STELLAR_NETWORK=public`
   - `SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org` (or your RPC)
   - `STELLAR_HORIZON_URL=https://horizon.stellar.org`

2. **App** – Wallet creation stays the same (public/secret keypair). The app uses your backend for balances and data; once the backend points at mainnet Horizon/Soroban, the app will show mainnet balances. You don’t need to change keypairs when switching to mainnet.

## USDC on Stellar

- **Trustline required** – A Stellar wallet must have a **trustline** set up for USDC before it can receive or hold USDC. The app should establish (or prompt to establish) the USDC trustline before “receive USDC” or on-ramp flows.
- **Settlement** – USDC on Stellar settles in ~5 seconds with fees of fractions of a cent.
- **Scale** – As of March 2025, there is over $200M USDC in circulation on Stellar.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status + timestamp |
| GET | `/api/health/live` | Liveness |
| GET | `/api/health/ready` | Readiness (includes Stellar RPC) |
| GET | `/api/wallet/balances?publicKey=G...` | Account balances |
| GET | `/api/wallet/exists?publicKey=G...` | Account exists |
| GET | `/api/stellar/network` | Current network (testnet/public) |
| GET | `/api/stellar/ledger` | Latest ledger sequence |
| POST | `/api/auth/register-or-login` | Body: `{ provider, providerUserId }` → `{ isNewUser, userId }` |
| POST | `/api/auth/link-wallet` | Body: `{ userId, stellarPublicKey }` – link wallet to user (sign-up) |

## Railway

- **Build**: Dockerfile (multi-stage Node 20).
- **Deploy**: Set env vars in Railway dashboard from `.env.example`.
- **Health**: `GET /api/health/live` used as healthcheck.

**Full steps:** see [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) for CLI deploy, GitHub deploy, and how to connect the Flutter app to your Railway URL.

## Optional: Auth

To add auth (e.g. Firebase or JWT), add:

- `src/routes/auth.routes.ts` – login/verify
- `src/middleware/auth.middleware.ts` – attach user to `req`
- Mount auth routes and protect `/api/wallet/*` with the middleware.
