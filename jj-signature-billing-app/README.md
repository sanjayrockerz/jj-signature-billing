# J.J Signature Billing

Independent React, Vite, and Supabase billing administration for J.J Signature.

## Local setup

The local admin portal is configured with portal ID `jjsignature` and password `jj@cenexa`.
The supplied client logo must be placed at `public/jj-signature-logo.png`; this is the only logo path used by the application, invoice preview, print, and receipt surfaces.

Add the dedicated J.J Signature Supabase URL and anon key to `.env` before connecting production data. Do not reuse another business database.

## Local setup

1. Copy `.env.example` to `.env` and add the dedicated J.J Signature Supabase URL, public key, and portal passwords.
2. Apply the SQL files in `supabase/migrations` in filename order.
3. Run `npm install`.
4. Run `npm run dev`.

The app keeps the established dashboard, POS billing, catalog, category, coupon, invoice, receipt, WhatsApp, and print flows. Local browser sessions use J.J Signature-specific storage keys and do not share state with other shop projects.

## Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WHATSAPP_NUMBER=916379048966`
- `VITE_ADMIN_ID`
- `VITE_ADMIN_AUTH_EMAIL` (the Supabase Auth email mapped from the admin portal ID)
- `VITE_STAFF_ID` (optional; defaults to `VITE_ADMIN_ID`)
- `VITE_STAFF_PASSWORD`

The canonical logo is `public/jj-signature-logo.png`. Replace this single file when the final client asset changes; all application and document surfaces reference the same path.
