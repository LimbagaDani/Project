# Portio — Portfolio Template Generator

Portio is a responsive, database-driven portfolio generator. Users enter their portfolio information, save it to Supabase, choose one of exactly three templates, preview the generated portfolio, and edit or delete the saved record.

## Features

- Secure cloud persistence through Supabase
- Anonymous Supabase sessions with row-level security
- Exactly three distinct portfolio templates: Simple, Modern, and Creative
- Save, retrieve, edit, preview, and delete operations
- Responsive interface for desktop and mobile
- Environment-based credentials with no secrets committed to source control

## Local setup

1. Create a Supabase project.
2. Open the SQL editor and run `src/lib/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Add your Supabase project URL and anonymous key.
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev`.

For production deployment, use the same Supabase project and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment variables.

## Database structure

- `public.portfolios`: one row per Supabase user. The row contains profile fields, projects, experience, template choice, profile photo URL, and timestamps.
- `storage.avatars`: optional public bucket for profile images.

## Deployment

### Vercel or Netlify

- Set the two environment variables shown in `.env.example`.
- Use `npm install` and `npm run build`.
- Publish the generated `dist` directory.

## Important

Do not commit `.env.local`, database passwords, service-role keys, or any API secret. The app only uses the public Supabase anonymous key and an anonymous authenticated session.
