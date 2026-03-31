# Luxe Salon - Complete Setup Guide

## Supabase Database Schema

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Stylists table
CREATE TABLE stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  profile_image TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  services JSONB NOT NULL,
  stylist_id UUID REFERENCES stylists(id),
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for services (public read)
CREATE POLICY "Services are viewable by everyone" ON services
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can view all services" ON services
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for stylists (public read)
CREATE POLICY "Stylists are viewable by everyone" ON stylists
  FOR SELECT USING (deleted_at IS NULL);

-- Policies for bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for favorites
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Policies for settings (public read)
CREATE POLICY "Settings are viewable by everyone" ON settings
  FOR SELECT USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('stylist-images', 'stylist-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Images are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id IN ('service-images', 'stylist-images'));

CREATE POLICY "Authenticated users can upload images" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id IN ('service-images', 'stylist-images') 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their uploaded images" ON storage.objects 
  FOR DELETE USING (
    bucket_id IN ('service-images', 'stylist-images') 
    AND auth.uid() = owner
  );

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('whatsapp_number', '254712345678'),
  ('terms_of_service', 'Default terms content here'),
  ('privacy_policy', 'Default privacy policy here')
ON CONFLICT (key) DO NOTHING;

-- Insert sample services
INSERT INTO services (name, category, price, duration, description) VALUES
  ('Classic Haircut', 'hair', 1500, '45 min', 'Professional haircut with styling'),
  ('Hair Coloring', 'hair', 4500, '2 hours', 'Full hair coloring service with premium products'),
  ('Balayage Highlights', 'hair', 6500, '3 hours', 'Natural-looking highlights with expert technique'),
  ('Classic Manicure', 'nails', 1200, '45 min', 'Traditional manicure with polish of your choice'),
  ('Gel Manicure', 'nails', 2000, '1 hour', 'Long-lasting gel polish manicure'),
  ('Spa Pedicure', 'nails', 2500, '1.5 hours', 'Luxurious pedicure with massage'),
  ('Deep Cleansing Facial', 'facial', 3500, '1 hour', 'Purifying facial for all skin types'),
  ('Anti-Aging Facial', 'facial', 4500, '1.5 hours', 'Advanced facial targeting fine lines'),
  ('Swedish Massage', 'massage', 3500, '1 hour', 'Relaxing full-body massage'),
  ('Deep Tissue Massage', 'massage', 4000, '1 hour', 'Therapeutic massage for muscle tension'),
  ('Bridal Makeup', 'makeup', 6000, '2 hours', 'Professional bridal makeup application'),
  ('Evening Makeup', 'makeup', 3000, '1 hour', 'Glamorous makeup for special occasions');

-- Insert sample stylists with Kenyan names
INSERT INTO stylists (name, bio, specialties) VALUES
  ('Wanjiku Mwangi', 'Expert hair stylist with 10 years experience', ARRAY['Hair Cutting', 'Coloring', 'Styling']),
  ('Akinyi Odhiambo', 'Certified nail technician specializing in nail art', ARRAY['Manicure', 'Pedicure', 'Nail Art']),
  ('Njeri Kamau', 'Professional makeup artist and beauty consultant', ARRAY['Bridal Makeup', 'Special Events', 'Airbrush']),
  ('Mumbi Kariuki', 'Licensed esthetician and spa therapist', ARRAY['Facials', 'Spa Treatments', 'Skincare']),
  ('Akoth Otieno', 'Certified massage therapist', ARRAY['Swedish Massage', 'Deep Tissue', 'Hot Stone']);
```

## Authentication Setup in Supabase

1. **Enable Email Authentication:**
   - Go to Authentication > Providers
   - Enable Email provider
   - Enable "Confirm email" if desired

2. **Enable Phone Authentication:**
   - Go to Authentication > Providers
   - Enable Phone provider
   - Configure Twilio or other SMS provider

3. **Enable Google OAuth:**
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

4. **Email Templates:**
   - Go to Authentication > Email Templates
   - Customize:
     - Confirmation email
     - Reset password email
     - Magic link email

## Features Implemented

### User Features:
- ✅ Multi-service selection in booking
- ✅ WhatsApp integration with booking details
- ✅ Rating modal after booking
- ✅ Persistent favorites (requires login)
- ✅ Auth with Email, Phone, Google
- ✅ KES currency throughout
- ✅ Kenyan addresses and phone numbers
- ✅ Terms of Service page
- ✅ Privacy Policy page
- ✅ Responsive design

### Admin Features:
- ✅ Service management (CRUD with soft delete)
- ✅ Image upload for services
- ✅ WhatsApp number configuration
- ✅ Terms & Privacy policy editor
- ✅ Dashboard with analytics
- ✅ Booking management
- ✅ Logout functionality

### Pending Implementation:
Due to length constraints, these features need to be added:

1. **Stylist Profiles with Carousel**
2. **Admin Reports (Daily/Weekly/Monthly/Yearly) with Export**
3. **Google Sign-In Integration**
4. **Phone Number Sign-In**
5. **Magic Links / OTP**
6. **Multiple Image Upload for Services**
7. **Image Carousel on Service Cards**
8. **Admin Settings Page for Terms/Privacy**

## Next Steps

1. Run the SQL schema in Supabase
2. Configure authentication providers
3. Test the booking flow
4. Add sample images to services
5. Configure WhatsApp number in settings table

## Environment Variables

The Supabase credentials are already configured in `/src/lib/supabase.ts`
