# Kevid Systems — clean rebuild

This is a static GitHub Pages app with Supabase Auth and per-user workspace records.
It intentionally contains no demo users, fake metrics, or sample customer records.

## Files
- `login.html` / `auth.js`: account creation and sign-in.
- `index.html` / `app.js`: protected workspace, contacts, conversations, automation rules, sign-out.
- `styles.css`: responsive dashboard/auth styling.
- `config.js`: public Supabase project URL and publishable/anon key.
- `supabase-schema.sql`: database tables, RLS policies, and profile trigger.

## Setup
1. In Supabase, open SQL Editor and run the full `supabase-schema.sql`.
2. Open `config.js` and replace both `PASTE_...` values with the Project URL and publishable/anon key from Project Settings → API. Never use a `service_role` key here.
3. Upload/replace all six files at the root of your GitHub Pages repository.
4. In Supabase → Authentication → URL Configuration, set Site URL to your published GitHub Pages URL and add that URL to Redirect URLs. Also allow `https://kevinhmutai.github.io/kevid-systems/**` if using path-specific redirect patterns.
5. For account confirmation behavior, review Supabase → Authentication → Providers → Email. If confirmations are enabled, a new user must confirm the email before signing in. If the confirmation email does not arrive, check spam and Supabase Auth email settings/logs.

## Important limits
This is a working account/data dashboard foundation, not a complete message-delivery backend. WhatsApp Business API, website-chat ingestion, outgoing email, and automatic rule execution require server-side integration and provider credentials. Do not place provider secrets in browser files.
