import { supabase } from './supabase';

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
  images: string[];
  is_visible_on_homepage?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Stylist {
  id: string;
  name: string;
  bio: string;
  profile_image: string;
  portfolio_images: string[];
  specialties: string[];
  is_active?: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface Availability {
  id: string;
  stylist_id: string | null;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

// ── Static fallback (shown instantly on page load before DB resolves) ─────────
export const STATIC_SERVICES: Service[] = [
  { id: 's2',  name: 'Hair Coloring',         category: 'hair',    price: 6500,  duration: '2 hours',   description: 'Full hair coloring service with premium products',           images: ['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800'],  is_visible_on_homepage: true, display_order: 1  },
  { id: 's3',  name: 'Balayage Highlights',   category: 'hair',    price: 9500,  duration: '3 hours',   description: 'Natural-looking highlights with expert technique',            images: ['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800'],  is_visible_on_homepage: true, display_order: 2  },
  { id: 's4',  name: 'Keratin Treatment',     category: 'hair',    price: 13500, duration: '3-4 hours', description: 'Smoothing treatment for frizz-free hair',                    images: ['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800'],  is_visible_on_homepage: true, display_order: 3  },
  { id: 's5',  name: 'Classic Manicure',      category: 'nails',   price: 1900,  duration: '45 min',    description: 'Traditional manicure with polish of your choice',            images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'], is_visible_on_homepage: true, display_order: 4  },
  { id: 's6',  name: 'Gel Manicure',          category: 'nails',   price: 3000,  duration: '1 hour',    description: 'Long-lasting gel polish manicure',                           images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'], is_visible_on_homepage: true, display_order: 5  },
  { id: 's7',  name: 'Spa Pedicure',          category: 'nails',   price: 3500,  duration: '1.5 hours', description: 'Luxurious pedicure with massage and moisturizing treatment',  images: ['https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800'], is_visible_on_homepage: true, display_order: 6  },
  { id: 's8',  name: 'Acrylic Nails',         category: 'nails',   price: 4000,  duration: '1.5 hours', description: 'Full set of acrylic nails with your choice of design',        images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'], is_visible_on_homepage: true, display_order: 7  },
  { id: 's9',  name: 'Deep Cleansing Facial', category: 'facials', price: 4500,  duration: '1 hour',    description: 'Purifying facial for all skin types',                        images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'], is_visible_on_homepage: true, display_order: 8  },
  { id: 's10', name: 'Anti-Aging Facial',     category: 'facials', price: 6000,  duration: '1.5 hours', description: 'Advanced facial targeting fine lines and wrinkles',           images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'], is_visible_on_homepage: true, display_order: 9  },
  { id: 's11', name: 'Hydrating Facial',      category: 'facials', price: 5200,  duration: '1 hour',    description: 'Moisture-restoring treatment for dry skin',                   images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'], is_visible_on_homepage: true, display_order: 10 },
  { id: 's12', name: 'Swedish Massage',       category: 'massage', price: 4900,  duration: '1 hour',    description: 'Relaxing full-body massage',                                 images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'],    is_visible_on_homepage: true, display_order: 11 },
  { id: 's13', name: 'Deep Tissue Massage',   category: 'massage', price: 5700,  duration: '1 hour',    description: 'Therapeutic massage for muscle tension',                     images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'],    is_visible_on_homepage: true, display_order: 12 },
  { id: 's14', name: 'Hot Stone Massage',     category: 'massage', price: 6500,  duration: '1.5 hours', description: 'Relaxing massage with heated stones',                        images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'],    is_visible_on_homepage: true, display_order: 13 },
  { id: 's15', name: 'Bridal Makeup',         category: 'makeup',  price: 8200,  duration: '2 hours',   description: 'Professional bridal makeup application',                     images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'], is_visible_on_homepage: true, display_order: 14 },
  { id: 's16', name: 'Evening Makeup',        category: 'makeup',  price: 4400,  duration: '1 hour',    description: 'Glamorous makeup for special occasions',                     images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'], is_visible_on_homepage: true, display_order: 15 },
  { id: 's17', name: 'Full Body Waxing',      category: 'waxing',  price: 7500,  duration: '1.5 hours', description: 'Complete full body waxing for smooth skin',                  images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'], is_visible_on_homepage: true, display_order: 16 },
  { id: 's18', name: 'Leg Waxing',            category: 'waxing',  price: 2800,  duration: '45 min',    description: 'Smooth legs with professional waxing',                       images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'], is_visible_on_homepage: true, display_order: 17 },
];

// ── In-memory cache (5 min TTL) ───────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;

let _servicesCache: { data: Service[]; ts: number } | null = null;
let _stylistsCache: { data: Stylist[]; ts: number } | null = null;

export function invalidateServicesCache() { _servicesCache = null; }
export function invalidateStylistsCache() { _stylistsCache = null; }

/** Fetch all active services — uses 5-min cache then Supabase, falls back to static list */
export async function fetchServices(): Promise<Service[]> {
  // Return cached data if fresh
  if (_servicesCache && Date.now() - _servicesCache.ts < CACHE_TTL) {
    return _servicesCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .is('deleted_at', null)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Services fetch error (using static fallback):', error.message);
      return STATIC_SERVICES;
    }

    const result = data && data.length > 0 ? (data as Service[]) : STATIC_SERVICES;
    _servicesCache = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.warn('Services fetch failed (using static fallback):', err);
    return STATIC_SERVICES;
  }
}

/** Fetch homepage-visible services only */
export async function fetchHomepageServices(): Promise<Service[]> {
  const all = await fetchServices();
  // Filter by is_visible_on_homepage — if field doesn't exist (old DB), show all
  const visible = all.filter(s => s.is_visible_on_homepage !== false);
  return visible.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
}

/** Fetch all active stylists — uses 5-min cache */
export async function fetchStylists(): Promise<Stylist[]> {
  if (_stylistsCache && Date.now() - _stylistsCache.ts < CACHE_TTL) {
    return _stylistsCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('stylists')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    _stylistsCache = { data: data as Stylist[], ts: Date.now() };
    return data as Stylist[];
  } catch {
    return [];
  }
}

/** Fetch all holidays */
export async function fetchHolidays(): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });
    if (error || !data) return [];
    return data as Holiday[];
  } catch {
    return [];
  }
}

/** Fetch all availability records */
export async function fetchAvailability(): Promise<Availability[]> {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('is_available', true);
    if (error || !data) return [];
    return data as Availability[];
  } catch {
    return [];
  }
}

/**
 * Check if a specific date is available for booking.
 * Returns true (available) if:
 * - Not a holiday
 * - Not in the past
 * - If stylist selected and has schedule: must be a working day
 * - If stylist has NO schedule configured: defaults to available
 */
export function isDateAvailable(
  date: Date,
  availability: Availability[],
  holidays: Holiday[],
  stylistId?: string
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return false;

  const isoDate = date.toISOString().split('T')[0];
  if (holidays.some(h => h.date === isoDate)) return false;

  if (stylistId) {
    const stylistAvail = availability.filter(
      a => a.stylist_id === stylistId && a.is_available
    );
    // If NO availability configured for this stylist → allow all days
    if (stylistAvail.length === 0) return true;

    const dayOfWeek = date.getDay();
    return stylistAvail.some(
      a => a.day_of_week === dayOfWeek || a.specific_date === isoDate
    );
  }

  // No stylist selected — check general salon availability
  const generalAvail = availability.filter(a => a.stylist_id === null && a.is_available);
  if (generalAvail.length === 0) return true; // No schedule = open

  const dayOfWeek = date.getDay();
  return generalAvail.some(
    a => a.day_of_week === dayOfWeek || a.specific_date === isoDate
  );
}

/**
 * Generate time slots for a given date.
 * Falls back to default 9 AM–7 PM if no availability rows found.
 */
export function generateTimeSlots(
  date: Date,
  availability: Availability[],
  holidays: Holiday[],
  stylistId?: string
): string[] {
  const isoDate = date.toISOString().split('T')[0];
  if (holidays.some(h => h.date === isoDate)) return [];

  const dayOfWeek = date.getDay();

  // Try stylist-specific rows first
  let rows = stylistId
    ? availability.filter(
        a =>
          a.stylist_id === stylistId &&
          a.is_available &&
          (a.day_of_week === dayOfWeek || a.specific_date === isoDate)
      )
    : [];

  // Fall back to salon-wide rows
  if (rows.length === 0) {
    rows = availability.filter(
      a =>
        a.stylist_id === null &&
        a.is_available &&
        (a.day_of_week === dayOfWeek || a.specific_date === isoDate)
    );
  }

  // Default: 9 AM – 7 PM if nothing configured
  if (rows.length === 0) {
    return [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
      '5:00 PM', '6:00 PM', '7:00 PM',
    ];
  }

  const slots: string[] = [];
  for (const row of rows) {
    const [startH, startM] = row.start_time.split(':').map(Number);
    const [endH] = row.end_time.split(':').map(Number);
    for (let h = startH; h < endH; h++) {
      const period = h < 12 ? 'AM' : 'PM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      if (h === startH && startM > 0) {
        slots.push(`${h12}:${String(startM).padStart(2, '0')} ${period}`);
      } else {
        slots.push(`${h12}:00 ${period}`);
      }
    }
  }
  return [...new Set(slots)];
}

/** KES formatter */
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}
