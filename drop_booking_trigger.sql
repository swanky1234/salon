-- ═══════════════════════════════════════════════════════════════════
-- Luxe Salon – Drop availability trigger that blocks bookings
-- Run this in Supabase SQL Editor: https://app.supabase.com
-- ═══════════════════════════════════════════════════════════════════

-- Drop ANY trigger on bookings that may check stylist availability
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'bookings'
      AND trigger_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON public.bookings';
    RAISE NOTICE 'Dropped trigger: %', trig.trigger_name;
  END LOOP;
END $$;

-- Also drop common trigger function names used for availability checks
DROP FUNCTION IF EXISTS check_stylist_availability() CASCADE;
DROP FUNCTION IF EXISTS validate_stylist_availability() CASCADE;
DROP FUNCTION IF EXISTS check_booking_availability() CASCADE;
DROP FUNCTION IF EXISTS validate_booking() CASCADE;
DROP FUNCTION IF EXISTS check_availability() CASCADE;

-- Confirm bookings table has no remaining triggers
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'bookings'
  AND trigger_schema = 'public';
-- Should return 0 rows
