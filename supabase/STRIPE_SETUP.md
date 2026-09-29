# SpinDecks premium — going live with card payments

The code is built and the two Edge Functions are deployed
(`create-checkout`, `stripe-webhook`). To switch on real payments you need to
do the Stripe + Supabase config below — these steps need your accounts, so they
can't be automated.

## 1. Auth redirect URLs (needed for sign-in)
Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://spindecks.app`
- **Redirect URLs**: add `https://spindecks.app/**` (and `http://localhost:8123/**` for local testing)

## 2. Create the products/prices in Stripe
Stripe dashboard → **Products**:
- A **monthly** subscription price (e.g. £3/mo) → copy its price id (`price_...`)
- A **one-off lifetime** price (e.g. £20, one-time) → copy its price id (`price_...`)

Match the display labels in `js/supa-config.js` (`PRICE_LABELS`) to whatever you set.

## 3. Add the secrets to the Edge Functions
Supabase dashboard → **Edge Functions → Secrets** (or `supabase secrets set`):
- `STRIPE_SECRET_KEY` = your Stripe secret key (`sk_live_...` or `sk_test_...`)
- `STRIPE_PRICE_MONTHLY` = the monthly `price_...`
- `STRIPE_PRICE_LIFETIME` = the lifetime `price_...`
- `STRIPE_WEBHOOK_SECRET` = from step 4

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

## 4. Point a Stripe webhook at the function
Stripe dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://alysrhsucjhsrfhdkyco.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` (step 3).

If Stripe deliveries get a 401, append the project anon key to the URL:
`…/stripe-webhook?apikey=<anon key>`.

## 5. Turn it on
In `js/supa-config.js` set `PAYMENTS_ENABLED = true`, bump the asset token,
`node build/generate.mjs`, commit and deploy. The account modal will then show
**Go Premium — monthly / lifetime** buttons for signed-in free users; paying
grants premium automatically via the webhook.

## How it works
- `create-checkout` (verify_jwt off; validates the user's bearer token itself)
  makes a Checkout Session for the chosen plan and returns its URL.
- `stripe-webhook` verifies the Stripe signature and, on
  `checkout.session.completed`, sets `profiles.plan = 'premium'` for the
  `user_id` in the session metadata (and reverts to `free` on
  `customer.subscription.deleted`). It uses the service-role key, so it bypasses
  RLS safely on the server only.
- Owner/allowlisted emails (`premium_emails`) are premium regardless, and the
  unlock-code path (`redeem_premium_code`) still works alongside payments.
