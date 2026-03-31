# Comprehensive Salon App Upgrade

## Goal
A broad set of improvements to the Nairobi/Luxe Salon web app, covering catalogue management, home page sync, booking UX, calendar/availability, stylist portfolios, favorites, currencies, and waxing services.

---

## Proposed Changes

### 1. Shared Data Layer — `src/lib/services-store.ts` [NEW]
A centralised Supabase-backed service store that all pages (home, services, catalogue) consume.  
- Fetches services from `supabase → services` table (with `images[]`, `deleted_at`, `category`).  
- Falls back to localStorage-seeded defaults if the table is empty.  
- Will be the **single source of truth** so admin adds/edits/deletes automatically show on the home page and services page.

---

### 2. Supabase Schema [SQL to run in Supabase Dashboard]

```sql
-- ===================== SERVICES =====================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,   -- hair | nails | facial | massage | makeup | waxing | other
  price numeric not null,
  duration text not null,
  description text,
  images text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- ===================== STYLISTS =====================
create table if not exists public.stylists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  profile_image text,
  portfolio_images text[] default '{}',
  specialties text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- ===================== AVAILABILITY =====================
-- Admin sets which days/hours the salon is open
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid references public.stylists(id) on delete cascade,  -- null = salon-wide
  day_of_week int,  -- 0=Sun … 6=Sat; null if specific_date used
  specific_date date,
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- ===================== HOLIDAYS =====================
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  created_at timestamptz default now()
);

-- ===================== BOOKINGS =====================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  phone text not null,
  services jsonb default '[]',
  stylist_id uuid references public.stylists(id),
  booking_date date not null,
  booking_time text not null,
  notes text,
  status text default 'pending',
  total_price numeric default 0,
  rating int,
  rating_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===================== FAVORITES =====================
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, service_id)
);

-- ===================== SETTINGS =====================
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  updated_at timestamptz default now()
);

-- ===================== STORAGE BUCKETS =====================
-- Run via Supabase > Storage UI or API:
-- create bucket 'service-images' (public)
-- create bucket 'stylist-images'  (public)
-- create bucket 'profile-pictures' (private, user-access)

-- ===================== RLS POLICIES =====================
alter table public.services enable row level security;
create policy "Public read services" on public.services for select using (deleted_at is null);
create policy "Admin write services" on public.services for all using (auth.jwt()->>'role' = 'admin');

alter table public.stylists enable row level security;
create policy "Public read stylists" on public.stylists for select using (deleted_at is null);
create policy "Admin write stylists" on public.stylists for all using (auth.jwt()->>'role' = 'admin');

alter table public.availability enable row level security;
create policy "Public read availability" on public.availability for select to authenticated using (true);
create policy "Admin write availability" on public.availability for all using (auth.jwt()->>'role' = 'admin');

alter table public.holidays enable row level security;
create policy "Public read holidays" on public.holidays for select using (true);
create policy "Admin write holidays" on public.holidays for all using (auth.jwt()->>'role' = 'admin');

alter table public.bookings enable row level security;
create policy "User manage bookings" on public.bookings for all using (auth.uid() = user_id);
create policy "Admin all bookings" on public.bookings for all using (auth.jwt()->>'role' = 'admin');

alter table public.favorites enable row level security;
create policy "User manage favorites" on public.favorites for all using (auth.uid() = user_id);

alter table public.settings enable row level security;
create policy "Public read settings" on public.settings for select using (true);
create policy "Admin write settings" on public.settings for all using (auth.jwt()->>'role' = 'admin');
```

---

### 3. Admin Catalogue Page — `src/app/pages/admin/catalogue.tsx` [MODIFY]
Major enhancements:
- Load services **from Supabase** (not localStorage).
- **Multiple image upload** with Supabase Storage via drag-and-drop or file picker; images stored in `service-images` bucket.
- **Image carousel preview** when editing.
- **Delete individual images** from a service.
- **Add category "waxing"** and **"other"** to the category dropdown.
- **Price in KES** (KES prefix, not $).
- Reflect add/edit/delete instantly on the catalogue and propagated to all other pages.

---

### 4. Home Page — `src/app/pages/home.tsx` [MODIFY]
- Load service cards from Supabase (same query as catalogue).
- Cards show **image carousel** (cycle through multiple images) for services with multiple images.
- **Kenyan testimonial names** (Wanjiru Njoroge, Akinyi Odhiambo, Kamau Mwangi, etc.).
- Currency shown as **KES** everywhere.
- **Waxing** added as a service category in the featured grid.

---

### 5. Services Page — `src/app/pages/services.tsx` [MODIFY]
- Load services from Supabase.
- **Waxing tab** added.
- Carousel on service cards.
- Save favorites to Supabase (logged-in users) and mirror to localStorage (fallback).
- Price badge → **KES**.

---

### 6. Favorites Page — `src/app/pages/favorites.tsx` [MODIFY]
- Load favorites from Supabase when user is logged in.
- Fall back to localStorage for anonymous users.
- Price in **KES**.

---

### 7. Booking Page — `src/app/pages/booking.tsx` [MODIFY]
- **Select Services** → multi-select **dropdown** (with checkboxes) rather than standalone list.
- Services loaded from Supabase.
- **Calendar**: shows on click (popover already exists). Marks **holidays** from Supabase as disabled.  Disables past dates and Sundays.
- **Time slots**: dynamically filtered against **availability** table for the selected date and chosen stylist.
- **Preferred Stylist**: a dropdown with a small **"View Portfolio"** expandable card showing profile picture + specialties.
- All prices in **KES**.

---

### 8. Admin Availability Page — `src/app/pages/admin/availability.tsx` [NEW]
- **Weekly schedule grid** (Mon-Sat) where admin sets open/closed + time ranges per day.
- Editor for **per-stylist** availability (override).
- **Holiday management**: add/remove holidays with name + date.
- Data saved to `availability` and `holidays` Supabase tables.

---

### 9. Admin Stylists Page — `src/app/pages/admin/stylists.tsx` [NEW]
- CRUD for stylists.
- Upload **profile picture** → saved to `stylist-images` bucket in Supabase Storage.
- Upload **portfolio images** (multi-image).
- Set **specialties** (tags).

---

### 10. Admin Layout — `src/app/components/admin-layout.tsx` [MODIFY]
- Add nav items for **Stylists** and **Availability** pages.

---

### 11. Routes — `src/app/routes.tsx` [MODIFY]
- Add `/admin/stylists` and `/admin/availability` routes.

---

### 12. Layout Nav — `src/app/components/layout.tsx` [MODIFY]
- Add **Waxing** to nav under All Services / Services links (reflected via the services page tabs).

---

### 13. Assets Folder — `public/assets/` [NEW]
- Placeholder images for default services, downloaded + placed here so they work offline.
- Referenced by the default service seed data.

---

## Open Questions

> [!IMPORTANT]
> The Supabase tables shown in the schema must be created manually in the Supabase dashboard. After I finish the code, I'll provide the exact SQL. Do you want me to also create a Supabase Edge Function to seed initial services, or will you run the SQL manually?

> [!NOTE]
> For **image storage**, I'll use the Supabase `service-images` and `stylist-images` public buckets. Profile pictures go to a `profile-pictures` bucket. The Supabase RLS for storage also needs to be configured. I will provide the SQL for that too.

---

## Verification Plan

### Automated Tests
- Build: `npm run build` — must pass with zero type errors.
- Dev server: `npm run dev` — check all pages load.

### Manual Verification
1. Admin adds a new service with multiple images → visible immediately on homepage cards with carousel.
2. Admin deletes a service → disappears from homepage and services page.
3. Admin sets availability (e.g., Wed 10-4 PM) → booking page only shows those times on Wednesday.
4. Admin adds a holiday → that date grayed out on booking calendar.
5. Booking "Select Services" shows as multi-select dropdown.
6. Preferred Stylist dropdown shows mini portfolio on hover/click.
7. Favorites saved/loaded from Supabase for logged-in users.
8. All prices show as KES.
9. Testimonials show Kenyan names.
10. Waxing category shows in nav, services tab, booking dropdown.
