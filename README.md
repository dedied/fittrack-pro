
# FitTrack Pro

FitTrack Pro is a simple, elegant, and offline-first Progressive Web App (PWA) designed to help you monitor your progress in fundamental exercises: **Pushups**, **Situps**, and **Bicep Curls**.

Built with React, Vite, and Tailwind CSS, it offers a seamless native-like experience on mobile devices.

## Features

- **📊 Interactive Charts:** Visualize your progress over daily, weekly, monthly, and yearly timeframes.
- **🔒 Privacy First & Secure:** Works completely offline. Includes a built-in PIN lock and Biometric authentication (FaceID/TouchID) to protect your data.
- **☁️ Optional Cloud Sync:** Sync your data across devices using Supabase.
- **📱 PWA Support:** Installable on iOS and Android.
- **💾 Data Control:** Export and import your workout logs via CSV.

## Database Setup (Supabase)

To enable cloud syncing, set up a Supabase project and run the following SQL query in the **SQL Editor** to create the necessary tables and security policies.

```sql
-- Drop existing tables
DROP TABLE IF EXISTS public.workouts;
DROP TABLE IF EXISTS public.profiles; -- Legacy table cleanup

------------------------------------------------------------
-- 1. WORKOUTS TABLE (linked directly to auth.users)
------------------------------------------------------------
CREATE TABLE public.workouts (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  reps INTEGER NOT NULL,
  weight FLOAT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 3. WORKOUTS POLICIES
------------------------------------------------------------

-- Unified policy: Users can only CRUD their own data
CREATE POLICY workouts_owner ON public.workouts
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```
