# NGN → USDC On-Ramp: Implementation Roadmap

This doc summarizes what was implemented and what remains for testnet E2E and mainnet launch.

## Implemented

### Phase 1 — Infrastructure / config
- **Anchor config examples**: `backend/docs/anchor/stellar.toml.example`, `assets.yaml.example`
- **Env**: `ANCHOR_PLATFORM_SERVER`, `ANCHOR_HOME_DOMAIN`, `SECRET_SEP24_INTERACTIVE_JWT_SECRET`, `USDC_ISSUER` in `config/index.ts` and `.env.example`

### Phase 2 — Node.js business server
- **SEP-24 JWT middleware**: `middleware/anchorAuth.middleware.ts` — verifies token from Anchor Platform interactive URL
- **Interactive deposit endpoint**: `GET /api/sep24/deposit?token=...&transaction_id=...` — serves HTML/JSON for NGN deposit UI
- **Anchor config endpoint**: `GET /api/sep24/anchor-config` — returns `anchorPlatformBaseUrl`, `anchorHomeDomain`, `depositEnabled`
- **Transaction status**: `GET /api/sep24/transaction/:id` (auth required) — proxy to Platform for polling
- **Services**: `kyc.service.ts`, `payment.service.ts`, `fx.service.ts`, `anchorPlatform.service.ts` (stubs + `notifyFundsReceived`, `getTransactionStatus`)

### Phase 3 — Flutter app
- **Backend API**: `getAnchorConfig()`, `getDepositTransactionStatus(transactionId)` in `BackendApiService`
- **Sep24DepositService**: SEP-10 (WebAuth.fromDomain) + SEP-24 deposit (TransferServerSEP24Service) via `stellar_flutter_sdk`
- **DepositWebViewPage**: Full-screen WebView for the interactive URL
- **“Buy with card or bank”**: Wired to start deposit when anchor is configured and secret is available; falls back to MoonPay link otherwise

## Next steps (Phase 4 — Testing)

1. **Deploy Anchor Platform** (Docker) on testnet; set `stellar.toml` and `assets.yaml` per `docs/anchor/`.
2. **Configure backend** with `ANCHOR_PLATFORM_SERVER`, `ANCHOR_HOME_DOMAIN`, `SECRET_SEP24_INTERACTIVE_JWT_SECRET` matching the Platform.
3. **Point Platform’s interactive URL** to your backend: `https://your-backend.com/api/sep24/deposit` (with token and transaction_id query params).
4. **Test E2E**: Wallet app → “Buy with card or bank” → SEP-10 → deposit/interactive → open WebView → complete mock NGN flow → webhook or manual PATCH to Platform → confirm USDC in wallet.
5. **Edge cases**: Payment received but Stellar send fails; user closes webview mid-flow; duplicate webhooks; expired JWT.

## Next steps (Phase 5 — Production)

1. **Mainnet**: Set `STELLAR_NETWORK=public`, `STELLAR_HORIZON_URL=https://horizon.stellar.org`; use mainnet Anchor Platform and distribution account.
2. **Real NGN rails**: Wire `payment.service.ts` to Paystack/Flutterwave; implement webhook verification and call `anchorPlatformService.notifyFundsReceived`.
3. **KYC**: Add `kyc_status` to `users` if needed; implement `kyc.service.ts` with your provider.
4. **Security audit** before going live with real funds.
