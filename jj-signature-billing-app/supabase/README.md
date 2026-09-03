# J.J Signature Supabase setup

Apply the remaining migrations in filename order to the dedicated J.J Signature
Supabase project. The old `purple_boutique` filename on the schema migration is
historical only; it creates the shared billing schema and RPCs and contains no
product catalog data.

The final catalog cleanup migration removes any legacy template catalog and
leaves only the three empty categories:

- Sarees
- Salwar
- Nighty

Do not enter varieties in SQL. Add each real product manually from the admin
portal under one of these categories.

The final catalog cleanup migration is intentionally destructive to legacy
catalog rows. Run it only on the separate J.J Signature database before real
products are entered. Do not run it against another business database.

After the listed migrations, run `20260903_0006_jj_signature_relationship_fixes.sql`
to add the order fields used by the dashboard/POS and repair existing
product-to-category links. It does not delete products or orders.

After the migrations, create the owner account in Supabase Authentication,
set `VITE_ADMIN_AUTH_EMAIL` to that email, and set the matching
`profiles.role` to `admin`.

Only the project URL and publishable/anonymous key belong in browser environment variables. Never put a service-role key or portal password in this repository.

The schema migration is idempotent. Invoice numbers use the format `PB-YYYY-000001` and are allocated under a locked database counter to prevent duplicates during concurrent billing.
