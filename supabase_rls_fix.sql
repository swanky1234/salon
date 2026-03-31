-- ═══════════════════════════════════════════════════════════════════
-- Luxe Salon – Supabase RLS Fix & Services Seed
-- Run this in your Supabase SQL Editor: https://app.supabase.com
-- ═══════════════════════════════════════════════════════════════════

-- 1. Allow anyone (anon) to READ services, stylists, availability, holidays
-- (these are public-facing pages)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view services" ON services;
CREATE POLICY "Public can view services"
  ON services FOR SELECT USING (deleted_at IS NULL);

ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view stylists" ON stylists;
CREATE POLICY "Public can view stylists"
  ON stylists FOR SELECT USING (deleted_at IS NULL AND is_active = true);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view holidays" ON holidays;
CREATE POLICY "Public can view holidays"
  ON holidays FOR SELECT USING (true);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view availability" ON availability;
CREATE POLICY "Public can view availability"
  ON availability FOR SELECT USING (is_available = true);

-- 2. Allow authenticated users to manage bookings and favorites
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookings" ON bookings;
CREATE POLICY "Users manage own bookings"
  ON bookings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites"
  ON favorites FOR ALL USING (auth.uid() = user_id);

-- 3. Allow public to read settings (for whatsapp number etc.)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view settings" ON settings;
CREATE POLICY "Public can view settings"
  ON settings FOR SELECT USING (true);

-- 4. Seed the 18 default services (safe - only inserts if not already there)
INSERT INTO services (name, category, price, duration, description, images)
SELECT * FROM (VALUES
  ('Classic Haircut',       'hair',    2500,  '45 min',    'Professional haircut with styling',                       ARRAY['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800']),
  ('Hair Coloring',         'hair',    6500,  '2 hours',   'Full hair coloring service with premium products',         ARRAY['https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=800']),
  ('Balayage Highlights',   'hair',    9500,  '3 hours',   'Natural-looking highlights with expert technique',         ARRAY['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800']),
  ('Keratin Treatment',     'hair',   13500,  '3-4 hours', 'Smoothing treatment for frizz-free hair',                 ARRAY['https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800']),
  ('Classic Manicure',      'nails',   1900,  '45 min',    'Traditional manicure with polish of your choice',         ARRAY['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800']),
  ('Gel Manicure',          'nails',   3000,  '1 hour',    'Long-lasting gel polish manicure',                        ARRAY['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800']),
  ('Spa Pedicure',          'nails',   3500,  '1.5 hours', 'Luxurious pedicure with massage and moisturizing treatment', ARRAY['https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800']),
  ('Acrylic Nails',         'nails',   4000,  '1.5 hours', 'Full set of acrylic nails with your choice of design',   ARRAY['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800']),
  ('Deep Cleansing Facial', 'facial',  4500,  '1 hour',    'Purifying facial for all skin types',                     ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800']),
  ('Anti-Aging Facial',     'facial',  6000,  '1.5 hours', 'Advanced facial targeting fine lines and wrinkles',       ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800']),
  ('Hydrating Facial',      'facial',  5200,  '1 hour',    'Moisture-restoring treatment for dry skin',               ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800']),
  ('Swedish Massage',       'massage', 4900,  '1 hour',    'Relaxing full-body massage',                              ARRAY['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800']),
  ('Deep Tissue Massage',   'massage', 5700,  '1 hour',    'Therapeutic massage for muscle tension',                  ARRAY['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800']),
  ('Hot Stone Massage',     'massage', 6500,  '1.5 hours', 'Relaxing massage with heated stones',                     ARRAY['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800']),
  ('Bridal Makeup',         'makeup',  8200,  '2 hours',   'Professional bridal makeup application',                  ARRAY['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800']),
  ('Evening Makeup',        'makeup',  4400,  '1 hour',    'Glamorous makeup for special occasions',                  ARRAY['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800']),
  ('Full Body Waxing',      'waxing',  7500,  '1.5 hours', 'Complete full body waxing for smooth skin',               ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800']),
  ('Leg Waxing',            'waxing',  2800,  '45 min',    'Smooth legs with professional waxing',                    ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'])
) AS v(name, category, price, duration, description, images)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE deleted_at IS NULL LIMIT 1);
