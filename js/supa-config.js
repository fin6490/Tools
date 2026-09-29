// supa-config.js — SpinDecks' Supabase project.
// These are PUBLIC values and are meant to ship in the browser: the anon key
// only permits what Row-Level Security allows, and every table is locked to the
// signed-in user. No secrets live here.
export const SUPABASE_URL = "https://alysrhsucjhsrfhdkyco.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseXNyaHN1Y2poc3JmaGRreWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTg2MTcsImV4cCI6MjEwNjE3NDYxN30.DINVoYgBILVb0L4Yh0kZmUSM1Frf_MhzIHb6LfW4eLM";
export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Card payments (Stripe Checkout via the create-checkout Edge Function).
// Flip to true once the Stripe secrets + prices are set in Supabase and the
// webhook is live (see supabase/STRIPE_SETUP.md). Until then, the account modal
// offers the unlock-code path only.
export const PAYMENTS_ENABLED = false;
// Human-readable prices shown on the upgrade buttons (display only — the real
// amounts live in Stripe). Update these to match your Stripe prices.
export const PRICE_LABELS = { monthly: "£3 / month", lifetime: "£20 once" };
