-- =====================================================
-- Luxe Salon - Full Supabase Schema
-- Safe to re-run: all policies are dropped first
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== TABLES =====================

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  profile_image TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id UUID REFERENCES public.stylists(id) ON DELETE CASCADE,
  day_of_week INT,
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  services JSONB DEFAULT '[]',
  stylist_id UUID REFERENCES public.stylists(id),
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  total_price NUMERIC DEFAULT 0,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== ENABLE RLS =====================

ALTER TABLE public.services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings    ENABLE ROW LEVEL SECURITY;

-- ===================== DROP OLD POLICIES (safe re-run) =====================

-- Services
DROP POLICY IF EXISTS "Public read services"  ON public.services;
DROP POLICY IF EXISTS "Admin write services"  ON public.services;

-- Stylists
DROP POLICY IF EXISTS "Public read stylists"  ON public.stylists;
DROP POLICY IF EXISTS "Admin write stylists"  ON public.stylists;

-- Availability
DROP POLICY IF EXISTS "Public read availability"  ON public.availability;
DROP POLICY IF EXISTS "Admin write availability"  ON public.availability;

-- Holidays
DROP POLICY IF EXISTS "Public read holidays"  ON public.holidays;
DROP POLICY IF EXISTS "Admin write holidays"  ON public.holidays;

-- Bookings
DROP POLICY IF EXISTS "User manage bookings"  ON public.bookings;
DROP POLICY IF EXISTS "Admin all bookings"    ON public.bookings;

-- Favorites
DROP POLICY IF EXISTS "User manage favorites" ON public.favorites;

-- Settings
DROP POLICY IF EXISTS "Public read settings"  ON public.settings;
DROP POLICY IF EXISTS "Admin write settings"  ON public.settings;

-- Storage (drop before recreating)
DROP POLICY IF EXISTS "Publicly accessible service/stylist images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload images"  ON storage.objects;
DROP POLICY IF EXISTS "Admin delete images"  ON storage.objects;

-- ===================== CREATE RLS POLICIES =====================

-- Services
CREATE POLICY "Public read services"
  ON public.services FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admin write services"
  ON public.services FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Stylists
CREATE POLICY "Public read stylists"
  ON public.stylists FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admin write stylists"
  ON public.stylists FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Availability
CREATE POLICY "Public read availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin write availability"
  ON public.availability FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Holidays
CREATE POLICY "Public read holidays"
  ON public.holidays FOR SELECT
  USING (true);

CREATE POLICY "Admin write holidays"
  ON public.holidays FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Bookings
CREATE POLICY "User manage bookings"
  ON public.bookings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admin all bookings"
  ON public.bookings FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Favorites
CREATE POLICY "User manage favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

-- Settings
CREATE POLICY "Public read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Admin write settings"
  ON public.settings FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- ===================== STORAGE BUCKETS =====================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('service-images',   'service-images',   true),
  ('stylist-images',   'stylist-images',   true),
  ('profile-pictures', 'profile-pictures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Publicly accessible service/stylist images"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('service-images', 'stylist-images'));

CREATE POLICY "Admin upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('service-images', 'stylist-images')
    AND auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "Admin delete images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('service-images', 'stylist-images')
    AND auth.jwt()->>'role' = 'admin'
  );

-- ===================== SEED DATA =====================

INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number',  '254712345678'),
  ('terms_of_service', 'Default terms content here'),
  ('privacy_policy',   'Default privacy policy here')
ON CONFLICT (key) DO NOTHING;
