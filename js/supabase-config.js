// WhiteBox Website + Supabase configuration
//
// 1) Copy this file to: js/supabase-config.js
// 2) Paste your values from Supabase:
//    Project Settings -> API -> (Legacy) "anon public" key and Project URL
//
// IMPORTANT
// - Use the *anon public* key here (safe for browser use)
// - DO NOT put your service_role / secret key in any website file.

window.WHITEBOX_SUPABASE_URL = "https://nojljuqfdzclxhggfbvc.supabase.co";
window.WHITEBOX_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vamxqdXFmZHpjbHhoZ2dmYnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Njk2MjAsImV4cCI6MjA4MzE0NTYyMH0.epr5gsgYhw8BDcEC-RVVUlEJlig1FrUGxYCpqzTo1sw";


// Extension store URLs
// NOTE: Store pages don't "download" automatically. Users are taken to the store listing and then
// click the store's install button (e.g., "Get" on Edge).
window.WHITEBOX_CHROME_STORE_URL = "https://chromewebstore.google.com/detail/whitebox/migfcmjbhmgffhnibcajdbbhnplfpeje";
window.WHITEBOX_EDGE_STORE_URL = "https://microsoftedge.microsoft.com/addons/detail/whitebox/facndlhcibibolgjnmjlddenjbjdnpbd";


// Stripe (Pro subscriptions) — set these to your Stripe Price IDs
window.WHITEBOX_STRIPE_PRICE_MONTHLY = "price_1SmiZE0k44qhvLJP3AOqvwzp";
window.WHITEBOX_STRIPE_PRICE_6MONTH  = "price_1Smmcz0k44qhvLJP5rlVOz7N";
window.WHITEBOX_STRIPE_PRICE_ANNUAL  = "price_1SmmdV0k44qhvLJPDdku5KMg";

// Supabase Edge Function endpoint for Stripe Checkout
// This should point to your deployed Edge Function (create-checkout).
// You can copy the Endpoint URL from Supabase Dashboard -> Edge Functions -> create-checkout.
// Example: https://<project-ref>.supabase.co/functions/v1/create-checkout
window.WHITEBOX_EDGE_FUNCTIONS_BASE_URL = "https://nojljuqfdzclxhggfbvc.supabase.co/functions/v1";
window.WHITEBOX_EDGE_STRIPE_CHECKOUT_URL = `${window.WHITEBOX_EDGE_FUNCTIONS_BASE_URL}/create-checkout`;

// Optional: Stripe Customer Portal (manage billing / cancel subscription)
// If you deploy an Edge Function named "create-portal-session", it will be used here.
window.WHITEBOX_EDGE_STRIPE_PORTAL_URL = `${window.WHITEBOX_EDGE_FUNCTIONS_BASE_URL}/create-portal-session`;

