# JVLI Fabric Inventory

Tracks fabric lots bought, meters used (sample or actual kurti), wastage and meters left.

Stack: Vite, React, TypeScript, Tailwind CSS v4, TanStack Router, TanStack Query, Supabase. Deploys to Vercel.

## 1. Supabase setup

1. Create a new project at supabase.com.
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates:
   - `fabric_lots`: one row per purchase (auto lot IDs like LOT-0001)
   - `fabric_usage`: one row per cut, tagged `sample` or `actual`
   - `fabric_stock`: a view with bought, used for samples, used for kurtis, wastage and meters left per lot
   - Row level security so only signed-in users can read or write
   - Guards that stop usage from exceeding what was bought
3. **Turn off public sign ups**: Authentication > Sign In / Providers > Email, then disable "Allow new users to sign up". Without this, anyone who finds your anon key could create an account and see your data.
4. **Create your users**: Authentication > Users > Add user, with an email and password, and tick "Auto Confirm User". Add one per teammate. There is no sign up page in the app, so this is the only way people get an account.
5. Copy your keys from Project Settings > API: the Project URL and the anon public key.

## 2. Run locally

```bash
npm install
cp .env.example .env     # then fill in the two values
npm run dev
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo. The Vite preset is detected automatically (build: `npm run build`, output: `dist`).
3. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. `vercel.json` already rewrites all routes to `index.html` so refreshing on `/lots` or `/usage` works.

## How the numbers work

- Meters left = meters bought minus meters used minus wastage, calculated by the database, never typed in.
- Sample vs actual is tagged on each usage row, so fabric bought for a sample that later goes into production is still counted correctly.
- Usage cost = meters used x the lot's rate per meter.
- A lot shows a Low badge when meters left drops to its low stock alert level (default 5 m).

## Project layout

```
supabase/schema.sql        database schema, view, policies
src/lib/                   Supabase client, auth, query hooks, formatting
src/pages/                 Login, Stock, Purchases, Usage
src/router.tsx             TanStack Router routes
```
