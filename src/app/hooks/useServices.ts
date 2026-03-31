import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

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

const DEFAULT_SERVICES: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>[] = [
  { name: 'Classic Haircut', category: 'hair', price: 800, duration: '45 min', description: 'Professional haircut with styling', images: ['https://images.unsplash.com/photo-1696835196034-cf22e2b72736?w=800'] },
  { name: 'Hair Coloring', category: 'hair', price: 3500, duration: '2 hours', description: 'Full hair coloring service with premium products', images: ['https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=800'] },
  { name: 'Balayage Highlights', category: 'hair', price: 6500, duration: '3 hours', description: 'Natural-looking highlights with expert technique', images: ['https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800'] },
  { name: 'Keratin Treatment', category: 'hair', price: 9000, duration: '3-4 hours', description: 'Smoothing treatment for frizz-free hair', images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800'] },
  { name: 'Classic Manicure', category: 'nails', price: 700, duration: '45 min', description: 'Traditional manicure with polish of your choice', images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'] },
  { name: 'Gel Manicure', category: 'nails', price: 1500, duration: '1 hour', description: 'Long-lasting gel polish manicure', images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'] },
  { name: 'Spa Pedicure', category: 'nails', price: 1800, duration: '1.5 hours', description: 'Luxurious pedicure with massage and moisturizing treatment', images: ['https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800'] },
  { name: 'Acrylic Nails', category: 'nails', price: 2500, duration: '1.5 hours', description: 'Full set of acrylic nails with your choice of design', images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800'] },
  { name: 'Deep Cleansing Facial', category: 'facial', price: 2500, duration: '1 hour', description: 'Purifying facial for all skin types', images: ['https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800'] },
  { name: 'Anti-Aging Facial', category: 'facial', price: 3500, duration: '1.5 hours', description: 'Advanced facial targeting fine lines and wrinkles', images: ['https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800'] },
  { name: 'Swedish Massage', category: 'massage', price: 3000, duration: '1 hour', description: 'Relaxing full-body massage', images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'] },
  { name: 'Deep Tissue Massage', category: 'massage', price: 3500, duration: '1 hour', description: 'Therapeutic massage for muscle tension', images: ['https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800'] },
  { name: 'Hot Stone Massage', category: 'massage', price: 4500, duration: '1.5 hours', description: 'Relaxing massage with heated stones', images: ['https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800'] },
  { name: 'Bridal Makeup', category: 'makeup', price: 6500, duration: '2 hours', description: 'Professional bridal makeup application', images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'] },
  { name: 'Evening Makeup', category: 'makeup', price: 3000, duration: '1 hour', description: 'Glamorous makeup for special occasions', images: ['https://images.unsplash.com/photo-1503236823255-94609f598e71?w=800'] },
  { name: 'Full Body Waxing', category: 'waxing', price: 3500, duration: '1.5 hours', description: 'Complete full body waxing for smooth skin', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'] },
  { name: 'Leg Waxing', category: 'waxing', price: 1500, duration: '45 min', description: 'Smooth legs with professional waxing', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'] },
  { name: 'Brazilian Wax', category: 'waxing', price: 2000, duration: '30 min', description: 'Professional Brazilian waxing service', images: ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'] },
];

let cachedServices: Service[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    // Return cache if fresh
    if (cachedServices && Date.now() - cacheTimestamp < CACHE_TTL) {
      setServices(cachedServices);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed defaults
        const toInsert = DEFAULT_SERVICES.map(s => ({
          ...s,
          images: s.images,
        }));
        const { data: inserted, error: insertError } = await supabase
          .from('services')
          .insert(toInsert)
          .select();
        if (!insertError && inserted) {
          cachedServices = inserted as Service[];
          cacheTimestamp = Date.now();
          setServices(inserted as Service[]);
        }
      } else {
        cachedServices = data as Service[];
        cacheTimestamp = Date.now();
        setServices(data as Service[]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateCache = () => {
    cachedServices = null;
    cacheTimestamp = 0;
  };

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return { services, loading, error, reload: () => { invalidateCache(); loadServices(); } };
}

export { DEFAULT_SERVICES };
