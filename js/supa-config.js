// supa-config.js — SpinDecks' Supabase project.
// These are PUBLIC values and are meant to ship in the browser: the anon key
// only permits what Row-Level Security allows, and every table is locked to the
// signed-in user. No secrets live here.
export const SUPABASE_URL = "https://alysrhsucjhsrfhdkyco.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseXNyaHN1Y2poc3JmaGRreWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTg2MTcsImV4cCI6MjEwNjE3NDYxN30.DINVoYgBILVb0L4Yh0kZmUSM1Frf_MhzIHb6LfW4eLM";
export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
