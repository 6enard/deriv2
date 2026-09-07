# Changing the Deriv API ID

This guide shows exactly how to swap in your own Deriv API ID so you can deploy this app as a template for a new buyer.

---

## What you need

1. A Deriv account (free at https://deriv.com)
2. A registered Deriv API app — create one at https://api.deriv.com/dashboard

---

## Step 1 — Register a new API app

1. Go to https://api.deriv.com/dashboard and sign in with your Deriv account.
2. Click **Register Application**.
3. Fill in:
   - **App name**: whatever you want buyers to see (e.g. "My Trading Template").
   - **Redirect URL**: the full URL where users land after logging in. For a production deploy this is `https://your-domain.com/callback`. For local development use `http://localhost:5173/callback`.
   - **Verification URL**: same as the Redirect URL (or a separate verification page if you build one).
4. After saving, you'll see an **App ID** (a number like `12345`) and an **Client ID** (a longer string). Copy both.

---

## Step 2 — Set environment variables

The app reads its Deriv credentials from environment variables. You set them wherever you deploy (Vercel, Netlify, etc.) and in your local `.env` file for development.

### Required variables

| Variable | What to put |
|---|---|
| `VITE_DERIV_CLIENT_ID` | The Client ID from the Deriv API dashboard. |
| `VITE_DERIV_APP_ID` | The App ID from the Deriv API dashboard (used as a fallback if Client ID is missing). |
| `VITE_DERIV_REDIRECT_URI` | The exact redirect URL you entered when registering the app. Must match. |

### For local development

Open `.env` in the project root and add:

```
VITE_DERIV_CLIENT_ID=your_client_id_here
VITE_DERIV_APP_ID=your_app_id_here
VITE_DERIV_REDIRECT_URI=http://localhost:5173/callback
```

### For production (Vercel)

1. Go to your project on Vercel.
2. **Settings → Environment Variables**.
3. Add the three variables above. Set `VITE_DERIV_REDIRECT_URI` to `https://your-domain.com/callback`.
4. Redeploy the project.

---

## Step 3 — Update the WebSocket URL (if needed)

The app connects to Deriv's WebSocket at:

```
wss://ws.derivws.com/websockets/v3?app_id=XXXX
```

This URL is defined in `src/lib/config.ts` as `DERIV_WS_URL`. By default it uses a placeholder app_id of `1089`. If you want the WebSocket traffic attributed to your own app, replace `1089` with your new App ID in that file.

---

## Step 4 — Verify the OAuth flow

1. Visit your deployed site (or localhost).
2. Click the connect / sign-in button.
3. You should be redirected to Deriv's login page.
4. After logging in, Deriv redirects back to your `/callback` page with an authorization code.
5. The app sends that code to the Supabase Edge Function (`deriv-oauth`) which exchanges it for access and refresh tokens.

If the redirect fails, check that `VITE_DERIV_REDIRECT_URI` exactly matches what you entered in the Deriv API dashboard (including `https://` vs `http://` and trailing slashes).

---

## Step 5 — Supabase setup (for the new buyer)

The app uses Supabase to store trade history and bot configurations. Each buyer needs their own Supabase project:

1. Create a new project at https://supabase.com.
2. In the project dashboard, go to **Settings → API** and copy the **Project URL** and **anon public key**.
3. Set these as environment variables:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
4. Run the migrations in `supabase/migrations/` against the new database. You can do this through the Supabase SQL Editor or by applying them in order.
5. Deploy the Edge Function:
   - The function source is in `supabase/functions/deriv-oauth/index.ts`.
   - Make sure `supabase/config.toml` has the `[functions.deriv-oauth]` table with `verify_jwt = false`.
   - Deploy using the Supabase MCP tool or the Supabase dashboard.

---

## Step 6 — Optional: set admin accounts

If you want certain Deriv account logins to have admin access (view the Admin page), set:

```
VITE_ADMIN_ACCOUNT_IDS=CR123456,CR789012
```

Comma-separated Deriv account login IDs. The app checks the logged-in user's account ID against this list.

---

## Quick checklist

- [ ] Registered a new Deriv API app at https://api.deriv.com/dashboard
- [ ] Set `VITE_DERIV_CLIENT_ID`, `VITE_DERIV_APP_ID`, `VITE_DERIV_REDIRECT_URI` in `.env` and on Vercel
- [ ] Updated the `app_id` in `src/lib/config.ts` (`DERIV_WS_URL`) if desired
- [ ] Created a new Supabase project and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Applied all migrations from `supabase/migrations/`
- [ ] Deployed the `deriv-oauth` Edge Function
- [ ] Optionally set `VITE_ADMIN_ACCOUNT_IDS`
- [ ] Tested the login flow end-to-end on the deployed site

---

## Files involved

| File | Purpose |
|---|---|
| `src/lib/config.ts` | Reads all Deriv and Supabase env vars. The single source of truth for configuration. |
| `src/lib/oauth.ts` | Builds the Deriv OAuth authorization URL using the Client ID and redirect URI. |
| `supabase/functions/deriv-oauth/index.ts` | Edge function that exchanges the OAuth code for tokens. Receives `client_id` and `redirect_uri` from the browser. |
| `.env` | Local environment variables. Never commit real secrets. |
| `supabase/config.toml` | Supabase project config, including Edge Function settings. |

---

## Selling as a template — what to hand the buyer

1. The full source code (this repository).
2. This `api.md` file.
3. Instructions to create their own Deriv API app and Supabase project.
4. The list of environment variables they need to set (see Step 2 and Step 5).

The buyer does NOT need your Deriv API ID or your Supabase keys. Everything is swapped by setting environment variables and optionally editing one line in `src/lib/config.ts`.
