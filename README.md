
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
------------------------------------------------------------
-- 0. TEAR DOWN (safe order)
------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.workouts;
DROP TABLE IF EXISTS public.profiles;

------------------------------------------------------------
-- 1. PROFILES TABLE (Store Premium Status)
------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Only service role can update premium status (payment provider webhook)
-- Users cannot update their own premium flag directly via API

------------------------------------------------------------
-- 2. WORKOUTS TABLE (directly linked to auth.users)
------------------------------------------------------------
CREATE TABLE public.workouts (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  -- We use FLOAT for reps to support distance-based exercises (e.g., 5.5 km)
  reps FLOAT NOT NULL,
  weight FLOAT,
  owner_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE
);

------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 4. RLS POLICIES
------------------------------------------------------------

-- Unified policy: users can only manage their own workouts
CREATE POLICY workouts_owner ON public.workouts
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

------------------------------------------------------------
-- 5. USER CREATION TRIGGER
-- Automatically creates a profile when a user signs up
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

------------------------------------------------------------
-- SECURE DELETE USER FUNCTION
-- Safely deletes ONLY the currently authenticated user
------------------------------------------------------------

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  uid uuid;
begin
  -- Ensure the caller is authenticated
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete the user from auth.users
  -- ON DELETE CASCADE will remove dependent rows (workouts, profiles)
  delete from auth.users
  where id = uid;

end;
$$;

alter function public.delete_user() owner to authenticated;
revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
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
