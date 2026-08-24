# HighSpot — go-live checklist

This folder is a real, deployable version of the board: a static frontend
(`public/index.html`) plus three Netlify serverless functions that talk to
Supabase (database) and Stripe (payments). Nothing charges real money or
saves real bids until you finish these steps.

## 1. Create the database (Supabase — free tier is fine)
1. Go to supabase.com → New project.
2. Once it's created, open the **SQL Editor** and paste in everything from
   `supabase-schema.sql`, then run it. This creates the `bids` table and
   adds the five starter rows.
3. Go to **Project Settings → API**. You'll need two values in a minute:
   - `Project URL` → this is `SUPABASE_URL`
   - `service_role` key (NOT the `anon` key — the service key is secret) → this is `SUPABASE_SERVICE_KEY`

## 2. Create your Stripe account
1. Go to stripe.com → sign up (or log in).
2. Dashboard → **Developers → API keys**. Copy the **Secret key**
   (starts `sk_test_...` while you're testing) → this is `STRIPE_SECRET_KEY`.
3. Leave the webhook step for after your site is deployed (step 4) — Stripe
   needs a live URL to send events to.

## 3. Push this folder to Netlify
Easiest path — no git needed:
1. Go to app.netlify.com → **Add new site → Deploy manually**.
2. Drag this whole `highspot-site` folder onto the page.
3. Netlify builds it and gives you a URL like `random-name-123.netlify.app`.

(If you'd rather connect a GitHub repo for auto-deploys on every push, that
works too — push this folder to a new repo first, then **Add new site →
Import from Git**.)

## 4. Add your environment variables
In Netlify: **Site settings → Environment variables**, add:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` — leave blank for now, coming next

Redeploy the site once these are saved (**Deploys → Trigger deploy**).

## 5. Point Stripe at your webhook
1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
3. Event to send: `checkout.session.completed`.
4. Stripe shows you a **Signing secret** (`whsec_...`) — copy it into
   Netlify's `STRIPE_WEBHOOK_SECRET` env var, then redeploy.

## 6. Test it
1. Open your Netlify URL, place a bid.
2. You'll land on a real Stripe Checkout page. Use Stripe's test card:
   `4242 4242 4242 4242`, any future expiry, any CVC.
3. After paying, Stripe redirects you back and the bid should appear on
   the board within a few seconds (the webhook writes it to Supabase).

## 7. Go live for real
- In Stripe, flip from **Test mode** to **Live mode** (top-left toggle),
  grab your live `sk_live_...` key, and update `STRIPE_SECRET_KEY` in
  Netlify. Repeat the webhook step for live mode (it has its own signing
  secret).
- Optional: add a custom domain in Netlify → **Domain management**.

## Swapping the logo for a PNG
Open `public/index.html`, find the `<div class="logo">` block near the top
of `<body>`, and replace it with:
```html
<img src="/logo.png" alt="HighSpot" style="height:28px;display:block;">
```
Then drop your `logo.png` file into the `public` folder before deploying.

## What's already handled for you
- **Real payments**: `create-checkout.js` builds a Stripe Checkout Session
  server-side; your secret key never touches the browser.
- **No double-charging on refresh**: the bid is only written to the board
  by the webhook, after Stripe confirms the charge — not by the browser.
- **Returning bidders**: each browser remembers its own last bid
  (in `localStorage`) and shows a "bid again" banner if someone else has
  since taken #1.
- **Same handle bidding again**: upserts on `(handle, platform)`, so it
  updates their existing spot instead of creating a duplicate.
