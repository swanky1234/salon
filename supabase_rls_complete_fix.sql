-- ═══════════════════════════════════════════════════════════════════
-- Luxe Salon – COMPLETE RLS & Storage Fix v2
-- Run this in your Supabase SQL Editor: https://app.supabase.com
-- Safe to re-run: uses DROP IF EXISTS everywhere
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. SERVICES ──────────────────────────────────────────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view services"       ON public.services;
DROP POLICY IF EXISTS "Public read services"           ON public.services;
DROP POLICY IF EXISTS "Admin write services"           ON public.services;
DROP POLICY IF EXISTS "Authenticated write services"   ON public.services;

CREATE POLICY "Public read services"
  ON public.services FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated write services"
  ON public.services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. STYLISTS ───────────────────────────────────────────────────────
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view stylists"       ON public.stylists;
DROP POLICY IF EXISTS "Public read stylists"           ON public.stylists;
DROP POLICY IF EXISTS "Admin write stylists"           ON public.stylists;
DROP POLICY IF EXISTS "Authenticated write stylists"   ON public.stylists;

CREATE POLICY "Public read stylists"
  ON public.stylists FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated write stylists"
  ON public.stylists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. AVAILABILITY ──────────────────────────────────────────────────
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view availability"     ON public.availability;
DROP POLICY IF EXISTS "Public read availability"         ON public.availability;
DROP POLICY IF EXISTS "Admin write availability"         ON public.availability;
DROP POLICY IF EXISTS "Authenticated write availability" ON public.availability;

CREATE POLICY "Public read availability"
  ON public.availability FOR SELECT
  USING (true);

CREATE POLICY "Authenticated write availability"
  ON public.availability FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. HOLIDAYS ───────────────────────────────────────────────────────
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view holidays"     ON public.holidays;
DROP POLICY IF EXISTS "Public read holidays"         ON public.holidays;
DROP POLICY IF EXISTS "Admin write holidays"         ON public.holidays;
DROP POLICY IF EXISTS "Authenticated write holidays" ON public.holidays;

CREATE POLICY "Public read holidays"
  ON public.holidays FOR SELECT
  USING (true);

CREATE POLICY "Authenticated write holidays"
  ON public.holidays FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. BOOKINGS ───────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bookings"       ON public.bookings;
DROP POLICY IF EXISTS "User manage bookings"            ON public.bookings;
DROP POLICY IF EXISTS "Admin all bookings"              ON public.bookings;
DROP POLICY IF EXISTS "Authenticated read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated update bookings"   ON public.bookings;

-- Authenticated users can INSERT their own bookings
CREATE POLICY "Users insert own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can SELECT their own bookings
CREATE POLICY "Users select own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can UPDATE their own bookings (reschedule, rating)
CREATE POLICY "Users update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can read ALL bookings (for dashboard)
CREATE POLICY "Admin read all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

-- Admin can update ANY booking (change status etc.)
CREATE POLICY "Admin update any booking"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 6. FAVORITES ──────────────────────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
DROP POLICY IF EXISTS "User manage favorites"      ON public.favorites;

CREATE POLICY "Users insert favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select favorites"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 7. SETTINGS ───────────────────────────────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view settings"       ON public.settings;
DROP POLICY IF EXISTS "Public read settings"           ON public.settings;
DROP POLICY IF EXISTS "Admin write settings"           ON public.settings;
DROP POLICY IF EXISTS "Authenticated write settings"   ON public.settings;

CREATE POLICY "Public read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated write settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 8. STORAGE BUCKETS ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('service-images',   'service-images',   true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('stylist-images',   'stylist-images',   true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('profile-pictures', 'profile-pictures', true,  5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Drop all old storage policies
DROP POLICY IF EXISTS "Publicly accessible service/stylist images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload images"                        ON storage.objects;
DROP POLICY IF EXISTS "Admin delete images"                        ON storage.objects;
DROP POLICY IF EXISTS "Public read storage"                        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload storage"               ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update storage"               ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete storage"               ON storage.objects;
DROP POLICY IF EXISTS "Users upload profile pictures"              ON storage.objects;

-- Anyone can VIEW public bucket files
CREATE POLICY "Public read storage"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('service-images', 'stylist-images', 'profile-pictures'));

-- Any authenticated user can UPLOAD
CREATE POLICY "Authenticated upload storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('service-images', 'stylist-images', 'profile-pictures'));

-- Any authenticated user can UPDATE storage objects
CREATE POLICY "Authenticated update storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('service-images', 'stylist-images', 'profile-pictures'));

-- Any authenticated user can DELETE storage objects
CREATE POLICY "Authenticated delete storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('service-images', 'stylist-images', 'profile-pictures'));

-- ── 9. SEED DEFAULT SETTINGS ──────────────────────────────────────────
INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number',  '254712345678'),
  ('terms_of_service', 'Welcome to Luxe Salon. By booking our services, you agree to our terms and conditions. All appointments must be confirmed 24 hours in advance. Cancellations require at least 12 hours notice. We reserve the right to refuse service.'),
  ('privacy_policy',   'Luxe Salon respects your privacy. We collect only necessary personal information for booking purposes. Your data is never shared with third parties without your consent.'),
  ('home_categories',  '[]')
ON CONFLICT (key) DO NOTHING;

-- ── DONE ─────────────────────────────────────────────────────────────
