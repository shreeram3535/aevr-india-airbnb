# Aevr

Airbnb-style marketplace prototype built with React, TypeScript, Vite, and Supabase.

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in your project URL and anon key.
3. Run the SQL in [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor.
4. Optionally seed categories and amenities with [supabase/seed.sql](./supabase/seed.sql).

## What is wired now

- Public browsing data can come from Supabase or fall back to the local mock dataset.
- Categories, listings, images, amenities, bookings, favorites, reviews, and messaging tables are defined in the schema.
- RLS policies are included so public browse data stays public while user-owned data remains scoped to the signed-in user.
- The frontend Supabase client is configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Local development

```bash
npm install
npm run dev
```

## Notes

- The app still has a mock fallback path, so it remains usable before Supabase is fully connected.
- Node 20.19+ is recommended for the current Vite version.

## Docs

- [Flash Sale Guide](./docs/flash-sale-guide.md)
- [Roles and Admin Access Guide](./docs/roles-and-admin-access.md)
