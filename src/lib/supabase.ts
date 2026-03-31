import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vppntsrbpdnmdwkllfal.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcG50c3JicGRubWR3a2xsZmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjUxNjgsImV4cCI6MjA4OTc0MTE2OH0.69--a_dR4GXhTu9NLe8uAos_yJ-72iibG7qM5RsPp3U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
  images: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Stylist {
  id: string;
  name: string;
  bio: string;
  profile_image: string;
  portfolio_images: string[];
  specialties: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Booking {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  services: {
    id: string;
    name: string;
    price: number;
  }[];
  stylist_id: string | null;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: string;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}
