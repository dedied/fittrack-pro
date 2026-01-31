
# FitTrack Pro

FitTrack Pro is a simple, elegant, and offline-first Progressive Web App (PWA) designed to help you monitor your progress in fundamental exercises: **Pushups**, **Situps**, and **Bicep Curls**.

Built with React, Vite, and Tailwind CSS, it offers a seamless native-like experience on mobile devices.

## Features

- **📊 Interactive Charts:** Visualize your progress over daily, weekly, monthly, and yearly timeframes.
- **🔒 Privacy First & Secure:** Works completely offline. Includes a built-in PIN lock and Biometric authentication (FaceID/TouchID) to protect your data.
- **☁️ Optional Cloud Sync:** Sync your data across devices using Supabase.
- **📱 PWA Support:** Installable on iOS and Android.
- **💾 Data Control:** Export and import your workout logs via CSV.

## 🔄 Sync Strategy

FitTrack Pro uses an **Offline-First** approach with a "Cloud-Wins" conflict resolution strategy to ensure data integrity across devices.

1.  **Local Storage:** The app always reads from and writes to the device's local storage for instant performance.
2.  **Cloud Synchronization:** When online and authenticated, the app performs a sync:
    - **Downloads** all logs from the database.
    - **Uploads** any local logs that don't exist in the cloud (new entries).
    - **Claims Ownership:** Any logs created while in "Guest Mode" are automatically assigned to the user upon login.
3.  **Conflict Resolution:**
    - If a specific log ID exists in both Local Storage and the Cloud, **the Cloud version is treated as the source of truth** and overwrites the local version.
    - This prevents stale local data on one device from overwriting edits made on another device...

## Database Setup (Supabase)

To enable cloud syncing, set up a Supabase project and run the following SQL query in the **SQL Editor** to create the necessary tables and security policies.

```sql
-- ================================
-- Secure migration script (public)
-- Run as DB owner / service_role
-- ================================

-- 0. TEAR DOWN
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.workouts;
DROP TABLE IF EXISTS public.profiles;

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT own profile
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT own profile
CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE own profile (but NOT is_premium)
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_premium = (SELECT is_premium FROM public.profiles WHERE id = auth.uid())
  );

-- Prevent DELETE by authenticated users
CREATE POLICY profiles_no_delete_for_users
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (false);

-- 2. WORKOUTS TABLE
CREATE TABLE public.workouts (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  reps DOUBLE PRECISION NOT NULL,
  weight DOUBLE PRECISION,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- SELECT own workouts
CREATE POLICY workouts_select_owner
  ON public.workouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- INSERT own workouts
CREATE POLICY workouts_insert_owner
  ON public.workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE own workouts
CREATE POLICY workouts_update_owner
  ON public.workouts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE own workouts
CREATE POLICY workouts_delete_owner
  ON public.workouts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER workouts_set_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

-- 3. USER CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, is_premium, updated_at)
  VALUES (NEW.id, FALSE, NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 4. SECURE DELETE USER FUNCTION
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $function$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_workouts_owner_id ON public.workouts (owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);

-- 6. PRIVILEGE HARDENING
REVOKE ALL ON TABLE public.workouts FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

```

## 🤖 Created with Google AI Studio, GitHub, GitHub Pages and Supabase

The coding for this project was entirely done using Google AI Studio.
See the end result at the [GitHub page](https://dedied.github.io/fittrack-pro/).

If you encounter rate limits when trying to sync changes directly to GitHub from AI Studio, you can download the project files and use the script below to automate the syncing process locally.

### Sync Script

Save this script as `sync_project.sh` and run it to automatically move the latest downloaded zip from AI Studio into your git repository and push changes.

```bash
#!/bin/bash

set -e

# CONFIGURATION
DOWNLOADS="$HOME/Downloads"
ZIP_INBOX="$HOME/aistudio-project-downloads/fittrack-pro"
PROJECT_DIR="$HOME/development/fittrack-pro"
TEMP_DIR="/tmp/fittrack_extract"

# Find the newest ZIP in Downloads starting with "fittrack-pro"
LATEST_ZIP=$(ls -t "$DOWNLOADS"/fittrack-pro*.zip 2>/dev/null | head -n 1)

if [ -z "$LATEST_ZIP" ]; then
  echo "No fittrack-pro*.zip files found in $DOWNLOADS"
  exit 1
fi

echo "Found latest ZIP in Downloads: $LATEST_ZIP"

# Move it into the inbox folder
mv "$LATEST_ZIP" "$ZIP_INBOX"/

# Now find the newest ZIP in the inbox (the one we just moved)
ZIP_FILE=$(ls -t "$ZIP_INBOX"/*.zip | head -n 1)

echo "Processing ZIP from inbox: $ZIP_FILE"

# Clean temp directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Extract ZIP
unzip "$ZIP_FILE" -d "$TEMP_DIR"

# Sync extracted files into the Git repo
rsync -av --delete --exclude='.git' "$TEMP_DIR"/ "$PROJECT_DIR"/

# Move into the project directory
cd "$PROJECT_DIR"

# Stage and commit changes
git add .
git commit -m "Update FitTrack Pro from latest AI Studio export"

# Push to GitHub
git push

echo "Sync complete."
```
