
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
    - This prevents stale local data on one device from overwriting edits made on another device.

## Database Setup (Supabase)

To enable cloud syncing, set up a Supabase project and run the following SQL query in the **SQL Editor** to create the necessary tables and security policies.

```sql
------------------------------------------------------------
-- 0. TEAR DOWN (safe order)
------------------------------------------------------------
DROP TABLE IF EXISTS public.workouts;

------------------------------------------------------------
-- 1. WORKOUTS TABLE (directly linked to auth.users)
------------------------------------------------------------
CREATE TABLE public.workouts (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  reps INTEGER NOT NULL,
  weight FLOAT,
  owner_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE
);

------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 3. RLS POLICIES
------------------------------------------------------------

-- Unified policy: users can only manage their own workouts
CREATE POLICY workouts_owner ON public.workouts
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```
