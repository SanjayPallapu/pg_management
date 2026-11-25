# PG HUB release-readiness plan

## Current baseline

- `npm test`: passing (50 tests).
- `npm run build`: passing.
- `npm run lint`: a required release check. Generated Android output is excluded.
- Android builds run lint, tests, and the web build before signing.

## Release checklist

Before any Google Play release, an owner must verify:

1. The production Supabase project has every pending migration applied and row-level security has been checked with owner, staff, and tenant accounts.
2. Edge-function secrets are configured: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_SECRET_KEY` (if Stripe is enabled), and the voice/logo API keys only when those features are enabled.
3. Payment webhooks are pointed to production and are tested with a non-production payment or provider test mode.
4. A release build is installed on a physical Android device and the login, payment entry, receipt sharing, tenant move-out, tenant onboarding, property switching, and app-update flows are smoke tested.
5. A restore/export procedure has been tested for the production database.

## Type-safety rollout

`@typescript-eslint/no-explicit-any` is currently a warning, not an error, because legacy Supabase and payment data paths contain 253 usages. Do not add new usages. Convert the code in this order:

1. Payment, subscription, and webhook payloads.
2. Tenant, room, and rent database query results.
3. Electricity, settlement, and reporting calculations.
4. UI-only state and utility helpers.

Once the warning count reaches zero, change the rule back to `error`.

## Test expansion

Add browser/device end-to-end coverage for the following release-critical journeys:

1. Phone/email sign-in and sign-out.
2. Record cash, UPI, and partial rent payments; generate and share a receipt.
3. Settle a departing tenant with pro-rated rent, deductions, and deposit refund.
4. Submit and approve tenant onboarding documents.
5. Subscribe, verify a webhook update, and enforce plan access.

Run these against a disposable Supabase project; never use production data in automated tests.
