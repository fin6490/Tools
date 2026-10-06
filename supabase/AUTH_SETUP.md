# SpinDecks — auth & billing setup (dashboard steps)

The code for Google sign-in, the "Manage billing" button and SMTP is in place.
These last bits are account/dashboard settings that can't be automated.

## Google sign-in
1. **Google Cloud Console** → create an OAuth 2.0 **Web** client
   (APIs & Services → Credentials → Create credentials → OAuth client ID).
   - Authorised redirect URI:
     `https://alysrhsucjhsrfhdkyco.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client secret**.
2. **Supabase** → Authentication → **Providers → Google** → enable, paste the
   Client ID + secret, save.
3. Make sure your site is in Authentication → URL Configuration (Site URL
   `https://spindecks.app`, redirect `https://spindecks.app/**`).
4. In `js/supa-config.js` set `GOOGLE_ENABLED = true`, bump the token,
   `node build/generate.mjs`, deploy. A **Continue with Google** button then
   appears on the sign-in panel.

## Custom SMTP (so sign-in emails scale)
Supabase's built-in email is rate-limited (a handful per hour) and only for
testing. For real volume add your own SMTP:
- Supabase → **Project Settings → Authentication → SMTP Settings** → enable
  custom SMTP and fill in host/port/user/pass + sender name/email.
- Good options: Resend, Postmark, Brevo, Mailgun, Amazon SES. You'll need to
  verify your sending domain (SPF/DKIM) with the provider.
- No code change — once SMTP is on, magic-link and OAuth emails send through it.

## Stripe customer portal ("Manage billing")
The `customer-portal` Edge Function is deployed. The portal must be configured
once per mode:
- Stripe → **Settings → Billing → Customer portal** → set what customers can do
  (cancel, update card, see invoices) and **Save**.
- Test mode usually has a default config already; **live mode needs this saved
  once** or the button errors.
No secrets beyond the `STRIPE_SECRET_KEY` you already set are required.
