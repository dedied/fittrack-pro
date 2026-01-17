
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
-- Drop existing tables (order matters because of FK constraints)
DROP TABLE IF EXISTS public.workouts;
DROP TABLE IF EXISTS public.profiles;

------------------------------------------------------------
-- 1. PROFILES TABLE (linked to auth.users)
------------------------------------------------------------
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,                         -- Profile ID
  owner_id UUID NOT NULL UNIQUE                -- Auth user ID
    REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 2. WORKOUTS TABLE (linked to profiles.id)
------------------------------------------------------------
CREATE TABLE public.workouts (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  reps INTEGER NOT NULL,
  weight FLOAT,
  user_id TEXT NOT NULL
    REFERENCES public.profiles (id) ON DELETE CASCADE
);

------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 4. PROFILES POLICIES
------------------------------------------------------------

-- Insert: user can create their own profile
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Select: user can read their own profile
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Update: user can update their own profile
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Delete: optional but recommended
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE
  USING (auth.uid() = owner_id);

------------------------------------------------------------
-- 5. WORKOUTS POLICIES
------------------------------------------------------------

-- One unified policy for all operations
CREATE POLICY workouts_owner ON public.workouts
  FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id
      FROM public.profiles
      WHERE profiles.id = workouts.user_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id
      FROM public.profiles
      WHERE profiles.id = workouts.user_id
    )
  );
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
