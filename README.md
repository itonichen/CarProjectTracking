# Garage

Mobile-first web app for tracking the restoration of four Mitsubishi 3000GTs:
parts per car, where each part physically is, and what was paid for it.

Next.js (App Router) · Tailwind · Supabase (Postgres, auth, storage) · Vercel

## Local setup

Needs Node 20+ and Docker Desktop (running).

```bash
npm install
npx supabase start          # first run pulls images; applies migrations
npx supabase status -o env  # copy API_URL, PUBLISHABLE_KEY, SECRET_KEY
cp .env.example .env.local  # paste the values in
npm run seed                # 1 household, 4 gen2 cars, sample purchases
npm run dev                 # http://localhost:3000
```

In development `DEV_AUTO_LOGIN_EMAIL` signs you in automatically as a seeded
user, so there is no login screen. It is ignored in production builds.
Magic-link emails (when auto sign-in is off) land in Mailpit at
http://127.0.0.1:54324.

`npm run seed` replaces the seed household, including any imported manuals,
so re-run the manual import afterwards.

## Importing and exporting

**Import** (sidebar, or the Import button on Money) takes any CSV:

- **Payments I made**: PayPal, Venmo or bank exports. Money coming in and
  transfers (top-ups, withdrawals) are skipped with the reason shown, foreign
  currency rows use the USD amount written in the row, and transaction IDs
  already imported are skipped. Payments can be assigned to a car during import
  or left for Money → To assign.
- **Parts I bought**: a spreadsheet export. A car column is matched to your
  cars by name or year; a "paid with" column also records the payment.

Columns are guessed from the headers and can all be changed. Each import is one
batch that can be undone from the Import page. Exports of purchases and
payments are on the same page.

## Service manuals

Manual PDFs and the diagrams cut from them live in the private `manuals`
storage bucket and show up under **Manuals** and on each linked part.

```bash
# 1. Crop figures (Python 3 with PyMuPDF and Pillow: pip install pymupdf pillow)
python scripts/manuals/extract_figures.py <manual.pdf> src/lib/manuals/w5mg1-w6mg1.json data/manuals/w5mg1-w6mg1
# 2. Upload the PDF and figures and record slot links
npm run manuals:import -- <manual.pdf> src/lib/manuals/w5mg1-w6mg1.json data/manuals/w5mg1-w6mg1
```

The JSON lists each figure's page, crop box, title and the slot types
(`template_key`, e.g. `base:clutch`) it links to. More links can be added from
a figure's page in the app. Manual pages are not committed: `data/` is
git-ignored.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (templates, zod schemas, money) |
| `npm run typecheck` | TypeScript |
| `npm run seed` | Dev seed data (local Supabase only) |
| `npm run manuals:import` | Upload a manual and its figures |
| `npm run templates:sync` | Add slots added to `src/lib/templates.ts` to existing cars (dry run; `-- --apply` to write) |

## Deploying to Vercel

Set these environment variables in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the hosted Supabase project
- Do not set `DEV_AUTO_LOGIN_EMAIL` (it's ignored in production anyway)

Push migrations to the hosted project with `npx supabase link` then
`npx supabase db push`, and add `https://<your-domain>/auth/callback` to
Supabase Auth's redirect URLs.
