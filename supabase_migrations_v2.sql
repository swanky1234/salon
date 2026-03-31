-- ═══════════════════════════════════════════════════════════════════
-- Luxe Salon – Migrations v2
-- Run AFTER supabase_rls_complete_fix.sql
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT everywhere
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Services – new columns ──────────────────────────────────────

-- Fix duration column type (may have been created as INTEGER)
ALTER TABLE public.services
  ALTER COLUMN duration TYPE TEXT USING duration::TEXT;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_visible_on_homepage BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set existing rows to visible
UPDATE public.services
  SET is_visible_on_homepage = TRUE
  WHERE is_visible_on_homepage IS NULL;

-- Add unique constraint on name so upsert ON CONFLICT works
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_name_unique;
ALTER TABLE public.services
  ADD CONSTRAINT services_name_unique UNIQUE (name);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services (category);
CREATE INDEX IF NOT EXISTS idx_services_visible  ON public.services (is_visible_on_homepage);
CREATE INDEX IF NOT EXISTS idx_services_order    ON public.services (display_order);

-- ── 2. booking_services join table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id   UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  price        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id
  ON public.booking_services (booking_id);

-- RLS
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own booking services" ON public.booking_services;
DROP POLICY IF EXISTS "Users insert booking services"   ON public.booking_services;
DROP POLICY IF EXISTS "Admin all booking services"      ON public.booking_services;

CREATE POLICY "Users insert booking services"
  ON public.booking_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users read own booking services"
  ON public.booking_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin all booking services"
  ON public.booking_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. Stylists – remove is_active dependency ──────────────────────
-- is_active column may not exist; we use deleted_at = NULL instead
-- This is a no-op if is_active already exists, harmless either way.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stylists' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.stylists ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- ── 4. Performance indexes on bookings ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date    ON public.bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status  ON public.bookings (status);

-- ── 5. Seed 18 default services if none exist ─────────────────────
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.services WHERE deleted_at IS NULL) = 0 THEN
    INSERT INTO public.services
      (name, description, price, duration, category, images, is_visible_on_homepage, display_order)
    VALUES
      ('Classic Haircut',      'Professional haircut with styling',                       2500,  '45 min',    'hair',    '{}', TRUE, 1),
      ('Hair Coloring',        'Full hair coloring service with premium products',         6500,  '2 hours',   'hair',    '{}', TRUE, 2),
      ('Balayage Highlights',  'Natural-looking highlights with expert technique',         9500,  '3 hours',   'hair',    '{}', TRUE, 3),
      ('Keratin Treatment',    'Smoothing treatment for frizz-free hair',                 13500, '3-4 hours', 'hair',    '{}', TRUE, 4),
      ('Classic Manicure',     'Traditional manicure with polish of your choice',         1900,  '45 min',    'nails',   '{}', TRUE, 5),
      ('Gel Manicure',         'Long-lasting gel polish manicure',                        3000,  '1 hour',    'nails',   '{}', TRUE, 6),
      ('Spa Pedicure',         'Luxurious pedicure with massage and moisturizing',        3500,  '1.5 hours', 'nails',   '{}', TRUE, 7),
      ('Acrylic Nails',        'Full set of acrylic nails with your choice of design',   4000,  '1.5 hours', 'nails',   '{}', TRUE, 8),
      ('Deep Cleansing Facial','Purifying facial for all skin types',                     4500,  '1 hour',    'facials', '{}', TRUE, 9),
      ('Anti-Aging Facial',    'Advanced facial targeting fine lines and wrinkles',       6000,  '1.5 hours', 'facials', '{}', TRUE, 10),
      ('Hydrating Facial',     'Moisture-restoring treatment for dry skin',               5200,  '1 hour',    'facials', '{}', TRUE, 11),
      ('Swedish Massage',      'Relaxing full-body massage',                              4900,  '1 hour',    'massage', '{}', TRUE, 12),
      ('Deep Tissue Massage',  'Therapeutic massage for muscle tension',                  5700,  '1 hour',    'massage', '{}', TRUE, 13),
      ('Hot Stone Massage',    'Relaxing massage with heated stones',                     6500,  '1.5 hours', 'massage', '{}', TRUE, 14),
      ('Bridal Makeup',        'Professional bridal makeup application',                  8200,  '2 hours',   'makeup',  '{}', TRUE, 15),
      ('Evening Makeup',       'Glamorous makeup for special occasions',                  4400,  '1 hour',    'makeup',  '{}', TRUE, 16),
      ('Full Body Waxing',     'Complete full body waxing for smooth skin',               7500,  '1.5 hours', 'waxing',  '{}', TRUE, 17),
      ('Leg Waxing',           'Smooth legs with professional waxing',                    2800,  '45 min',    'waxing',  '{}', TRUE, 18)
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

-- ── DONE ──────────────────────────────────────────────────────────
-- After running this, go to Supabase → Database → Replication
-- and enable realtime on the 'settings' and 'services' tables.
