# folio / Portfolio Studio

A responsive portfolio generator with create, preview, edit, and delete flows. It provides exactly three portfolio layouts: Simple, Modern, and Creative.

## Technologies

- HTML, CSS, and vanilla JavaScript
- Supabase REST API and PostgreSQL (`jsonb` portfolio data)
- Static hosting: deploy the project root to Netlify, Vercel, or another static host

## Set up the online database

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run [`supabase-schema.sql`](supabase-schema.sql).
3. Copy the project URL and the anon key from Project Settings > API.
4. For local testing, open the site and choose **Connect database**. The URL and public key are stored in the current browser only.
5. Before deployment, put the same public values in [`config.js`](config.js), then deploy the full project root. The anon key is intended for browser use; never use a service-role or secret key in this site.

The table is `public.portfolios`:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Portfolio identifier |
| `data` | `jsonb` | Profile, education, skills, projects, experience, and links |
| `template` | `text` | `simple`, `modern`, or `creative` |
| `created_at` | `timestamptz` | Creation time |
| `updated_at` | `timestamptz` | Last edit time |

The included SQL policy allows anonymous read/write access so an instructor can test CRUD without signing in. This is appropriate only for a public classroom demonstration: anyone with the site URL can read, create, change, or delete records. Do not store private contact details or confidential data. A real public service should add authentication and owner-scoped row-level security.

## Run locally

Because the app is static, open `index.html` in a browser, or serve the project directory with any static HTTP server. Configure Supabase before trying to save. The browser's local configuration is not a substitute for the cloud database.

## Deploy

Import this source folder into Netlify or Vercel as a static site. No build command is needed; set the publish/output directory to the repository root. Set `config.js` before deployment. Once hosted, add the deployed site's origin to Supabase's API settings if your project restricts allowed origins, then test create, reload, edit, template switching, and delete using the public URL.

## Submission details

- **Project title:** folio / Portfolio Studio
- **Database platform:** Supabase
- **Hosting platform:** Choose Netlify or Vercel when publishing
- **Published URL:** Add the final hosting URL here after deployment
- **Screenshots:** Capture the overview, information form, template chooser, and each of the three portfolio previews after setting up the database.

The source is deployment-ready, but a public URL and live database cannot be provisioned from this workspace without access to your Supabase and hosting accounts.